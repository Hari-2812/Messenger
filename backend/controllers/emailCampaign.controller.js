const EmailCampaign = require('../models/EmailCampaign');
const EmailLog = require('../models/EmailLog');
const Contact = require('../models/Contact');
const brevoService = require('../services/brevo.service');
const fs = require('fs');

// @desc    Get email campaigns
// @route   GET /api/email-campaigns
const getCampaigns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await EmailCampaign.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    const total = await EmailCampaign.countDocuments();

    res.json({
      campaigns,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching email campaigns:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/email-campaigns/dashboard-stats
const getDashboardStats = async (req, res) => {
  try {
    const totalContacts = await Contact.countDocuments({ email: { $ne: '' } });
    const totalCampaigns = await EmailCampaign.countDocuments();
    
    // Emails sent today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const emailsSentToday = await EmailLog.countDocuments({ 
      status: 'sent', 
      sentAt: { $gte: startOfDay, $lte: endOfDay } 
    });

    // Aggregate stats from campaigns
    const statsAggr = await EmailCampaign.aggregate([
      {
        $group: {
          _id: null,
          delivered: { $sum: '$stats.delivered' },
          failed: { $sum: '$stats.failed' },
          pending: { $sum: { $subtract: ['$stats.totalContacts', { $add: ['$stats.delivered', '$stats.failed', '$stats.bounce'] }] } },
        }
      }
    ]);

    const stats = statsAggr[0] || { delivered: 0, failed: 0, pending: 0 };
    
    // Recent campaigns
    const recentCampaigns = await EmailCampaign.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      totalContacts,
      totalCampaigns,
      emailsSentToday,
      delivered: stats.delivered,
      failed: stats.failed,
      pending: stats.pending > 0 ? stats.pending : 0,
      recentCampaigns
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create and send (or schedule) email campaign
// @route   POST /api/email-campaigns
const createCampaign = async (req, res) => {
  try {
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_NAME || !process.env.BREVO_SENDER_EMAIL) {
      return res.status(400).json({ message: 'Brevo configuration missing. Please verify BREVO_API_KEY, BREVO_SENDER_NAME, and BREVO_SENDER_EMAIL in your environment.' });
    }

    const { name, subject, senderName, senderEmail, htmlContent, templateId, scheduledAt, isDraft } = req.body;
    
    // We assume the user can optionally pass recipients, or we fetch all contacts with email
    let { recipients } = req.body; 
    
    if (typeof recipients === 'string') {
      try { recipients = JSON.parse(recipients); } catch(e) {}
    }
    
    // If no specific recipients, get all contacts with an email address
    if (!recipients || recipients.length === 0) {
      const contacts = await Contact.find({ email: { $ne: '' }, isDeleted: { $ne: true } }).select('_id');
      recipients = contacts.map(c => c._id);
    }

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No recipients found with valid email addresses.' });
    }

    const attachments = [];
    if (req.file) {
      // Assuming a local upload, we'd need a public URL for Brevo or pass base64.
      // Brevo accepts { content: base64, name: filename }
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64Content = fileBuffer.toString('base64');
      attachments.push({
        content: base64Content,
        name: req.file.originalname
      });
      // Clean up the local temp file
      fs.unlinkSync(req.file.path);
    }

    const campaign = new EmailCampaign({
      name,
      subject,
      senderName,
      senderEmail,
      htmlContent,
      templateId: templateId || null,
      recipients,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: isDraft ? 'Draft' : (scheduledAt ? 'Scheduled' : 'Sending'),
      attachments: req.file ? [{ url: 'attached', name: req.file.originalname }] : [],
      stats: {
        totalContacts: recipients.length,
      },
      createdBy: req.user?._id
    });

    await campaign.save();

    if (!isDraft && !scheduledAt) {
      // Trigger sending asynchronously
      sendCampaignEmails(campaign, attachments);
    }

    res.status(201).json({ message: 'Campaign created successfully', campaign });
  } catch (error) {
    console.error('Error creating email campaign:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to enqueue emails in background
const sendCampaignEmails = async (campaign, attachments) => {
  console.log(`[Campaign] Starting enqueue process for campaign ${campaign._id}. Requested recipients: ${campaign.recipients.length}`);
  try {
    const contacts = await Contact.find({ _id: { $in: campaign.recipients } });
    console.log(`[Campaign] Retrieved ${contacts.length} contacts from database.`);
    
    const logsToInsert = [];

    for (const contact of contacts) {
      if (!contact.email) {
        console.warn(`[Campaign] Contact ${contact._id} has no email address. Skipping.`);
        continue;
      }
      
      logsToInsert.push({
        campaignId: campaign._id,
        contactId: contact._id,
        recipientName: contact.name,
        recipientEmail: contact.email,
        customFields: contact.customFields,
        status: 'Pending'
      });
    }

    if (logsToInsert.length > 0) {
      console.log(`[Campaign] Inserting ${logsToInsert.length} logs to MongoDB...`);
      await EmailLog.insertMany(logsToInsert);
      console.log(`[Campaign] Successfully inserted ${logsToInsert.length} pending emails into queue.`);
    } else {
      console.warn(`[Campaign] No valid emails found to enqueue for campaign ${campaign._id}`);
    }

    campaign.stats.totalContacts = logsToInsert.length;
    campaign.status = 'Sending'; // It's in the queue now
    await campaign.save();
    
    // The actual sending will be handled by the background cron job (emailQueue.service.js)
    console.log(`[Campaign] Finished enqueueing. Total queued emails for campaign ${campaign._id}: ${logsToInsert.length}`);
  } catch (error) {
    console.error(`[Campaign] Error enqueueing campaign ${campaign._id}:`, error.message);
    if (error.response) console.error(error.response.data);
    
    campaign.status = 'Failed';
    campaign.error = error.message;
    await campaign.save();
  }
};

// @desc    Get campaign history / single campaign details
// @route   GET /api/email-campaigns/:id
const getCampaignById = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    // Fetch logs for this campaign
    const logs = await EmailLog.find({ campaignId: campaign._id }).limit(100); // paginate in real app

    res.json({ campaign, logs });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a campaign
// @route   DELETE /api/email-campaigns/:id
const deleteCampaign = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    await EmailLog.deleteMany({ campaignId: campaign._id });
    await EmailCampaign.deleteOne({ _id: campaign._id });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Pause a campaign
// @route   PUT /api/email-campaigns/:id/pause
const pauseCampaign = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (campaign.status === 'Sending' || campaign.status === 'Scheduled') {
      campaign.status = 'Paused';
      await campaign.save();
    }
    res.json({ message: 'Campaign paused successfully', campaign });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Resume a campaign
// @route   PUT /api/email-campaigns/:id/resume
const resumeCampaign = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (campaign.status === 'Paused') {
      campaign.status = 'Sending';
      await campaign.save();
    }
    res.json({ message: 'Campaign resumed successfully', campaign });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCampaigns,
  getDashboardStats,
  createCampaign,
  getCampaignById,
  deleteCampaign,
  pauseCampaign,
  resumeCampaign
};
