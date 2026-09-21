const EmailCampaign = require('../models/EmailCampaign');
const EmailLog = require('../models/EmailLog');
const Contact = require('../models/Contact');
const User = require('../models/User');
const brevoService = require('../services/brevo.service');
const fs = require('fs');

// @desc    Get eligible email sender accounts (Admin only)
// @route   GET /api/email-campaigns/senders
const getSenders = async (req, res) => {
  try {
    const isAdmin = req.user?.role && (req.user.role.toLowerCase() === 'admin' || req.user.role.toLowerCase() === 'administrator');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only administrators can view senders.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const senders = await User.find({ 'brevo.connected': true })
      .select('firstName lastName email brevo.connected brevo.senderEmail brevo.senderName brevo.dailyLimit brevo.emailsSentToday brevo.usageDate');

    const mappedSenders = senders.map(sender => {
      const dailyLimit = sender.brevo.dailyLimit || 250;
      const emailsSentToday = sender.brevo.usageDate === todayStr ? (sender.brevo.emailsSentToday || 0) : 0;
      const remainingToday = Math.max(0, dailyLimit - emailsSentToday);

      return {
        _id: sender._id,
        firstName: sender.firstName,
        lastName: sender.lastName,
        email: sender.email,
        brevo: {
          connected: sender.brevo.connected,
          senderEmail: sender.brevo.senderEmail,
          senderName: sender.brevo.senderName,
          dailyLimit,
          emailsSentToday,
          remainingToday
        }
      };
    });

    res.json(mappedSenders);
  } catch (error) {
    console.error('Error fetching senders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get email campaigns
// @route   GET /api/email-campaigns
const getCampaigns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = req.user?.role === 'admin' ? {} : { createdBy: req.user._id };

    const campaigns = await EmailCampaign.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    const total = await EmailCampaign.countDocuments(query);

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
    const contactQuery = req.user?.role === 'admin' ? { isDeleted: { $ne: true }, email: { $ne: '' } } : { isDeleted: { $ne: true }, email: { $ne: '' }, userId: req.user._id };
    const totalContacts = await Contact.countDocuments(contactQuery);
    
    const campaignQuery = req.user?.role === 'admin' ? {} : { createdBy: req.user._id };
    const totalCampaigns = await EmailCampaign.countDocuments(campaignQuery);
    
    const userCampaigns = await EmailCampaign.find(campaignQuery).select('_id');
    const userCampaignIds = userCampaigns.map(c => c._id);

    // Aggregate stats directly from EmailLog
    const delivered = await EmailLog.countDocuments({ campaignId: { $in: userCampaignIds }, status: 'sent' });
    const failed = await EmailLog.countDocuments({ campaignId: { $in: userCampaignIds }, status: { $in: ['failed', 'bounce'] } });
    const pending = await EmailLog.countDocuments({ campaignId: { $in: userCampaignIds }, status: { $in: ['pending', 'sending'] } });

    // Recent campaigns - fetch with full stats calculated or rely on the stored stats
    // We will let the frontend calculate progress from c.stats (we'll ensure queue updates it)
    const recentCampaigns = await EmailCampaign.find(campaignQuery).sort({ createdAt: -1 }).limit(5);

    // Email Usage logic
    let emailsSentToday = 0;
    let dailyLimit = 250;
    let remainingToday = 250;
    
    if (req.user && req.user.brevo) {
      const todayStr = new Date().toISOString().split('T')[0];
      // Note: If usageDate is not today, the queue handles reset, but we can safely report 0 sent today
      emailsSentToday = req.user.brevo.usageDate === todayStr ? (req.user.brevo.emailsSentToday || 0) : 0;
      dailyLimit = req.user.brevo.dailyLimit || 250;
      remainingToday = Math.max(0, dailyLimit - emailsSentToday);
    }

    let sendersList = [];
    const isAdmin = req.user?.role && (req.user.role.toLowerCase() === 'admin' || req.user.role.toLowerCase() === 'administrator');
    if (isAdmin) {
      const todayStr = new Date().toISOString().split('T')[0];
      const senders = await User.find({ 'brevo.connected': true })
        .select('firstName lastName email brevo.connected brevo.senderEmail brevo.senderName brevo.dailyLimit brevo.emailsSentToday brevo.usageDate');

      sendersList = senders.map(sender => {
        const dLimit = sender.brevo.dailyLimit || 250;
        const eSentToday = sender.brevo.usageDate === todayStr ? (sender.brevo.emailsSentToday || 0) : 0;
        return {
          _id: sender._id,
          firstName: sender.firstName,
          lastName: sender.lastName,
          email: sender.email,
          brevo: {
            connected: sender.brevo.connected,
            senderEmail: sender.brevo.senderEmail,
            senderName: sender.brevo.senderName,
            dailyLimit: dLimit,
            emailsSentToday: eSentToday,
            remainingToday: Math.max(0, dLimit - eSentToday)
          }
        };
      });
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({
      totalContacts,
      totalCampaigns,
      emailsSentToday,
      dailyLimit,
      remainingToday,
      delivered,
      failed,
      pending,
      recentCampaigns,
      senders: sendersList
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
    const isAdmin = req.user?.role && (req.user.role.toLowerCase() === 'admin' || req.user.role.toLowerCase() === 'administrator');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only administrators can create campaigns.' });
    }

    const { name, subject, htmlContent, templateId, scheduledAt, isDraft, dailyLimit, googleSheetSource, senderUserId } = req.body;
    
    if (!senderUserId) {
      return res.status(400).json({ message: 'Please select a sender employee for this campaign.' });
    }

    // Verify sender exists and has valid Brevo connection
    const sender = await User.findById(senderUserId).select('brevo');
    if (!sender || !sender.brevo || !sender.brevo.connected) {
      return res.status(400).json({ message: 'The selected sender employee does not have a valid Brevo connection.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const sLimit = sender.brevo.dailyLimit || 250;
    const sSentToday = sender.brevo.usageDate === todayStr ? (sender.brevo.emailsSentToday || 0) : 0;
    const sRemaining = Math.max(0, sLimit - sSentToday);

    // Idempotency Check: Prevent duplicate campaigns (same name, created by same user, within 5 mins)
    if (req.user && req.user._id) {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existingCampaign = await EmailCampaign.findOne({
        name,
        createdBy: req.user._id,
        createdAt: { $gte: fiveMinsAgo }
      });

      if (existingCampaign) {
        return res.status(400).json({ message: 'A campaign with this name was already created recently. Please wait before creating again.' });
      }
    }

    let { recipients } = req.body; 
    
    if (typeof recipients === 'string') {
      try { recipients = JSON.parse(recipients); } catch(e) {}
    }
    
    // If no specific recipients, get all active contacts with a valid email address
    if (!recipients || recipients.length === 0) {
      const contacts = await Contact.find({ 
        email: { $exists: true, $type: 'string', $nin: ['', null] },
        isDeleted: { $ne: true },
        status: { $ne: 'Unsubscribed' }
      }).select('_id');
      recipients = contacts.map(c => c._id.toString());
    }

    // Deduplicate recipient IDs to prevent sending twice
    recipients = [...new Set(recipients.map(r => r.toString()))];

    // Filter recipients rigorously from the DB to skip Unsubscribed and Invalid emails
    const validContacts = await Contact.find({
      _id: { $in: recipients },
      email: { $exists: true, $type: 'string', $nin: ['', null] },
      isDeleted: { $ne: true },
      status: { $ne: 'Unsubscribed' }
    }).select('_id name email');

    const validRecipientIds = validContacts.map(c => c._id.toString());
    const skippedCount = recipients.length - validRecipientIds.length;

    if (validRecipientIds.length === 0) {
      return res.status(400).json({ message: 'No valid recipients found. They might be unsubscribed or missing email addresses.' });
    }

    const campaign = new EmailCampaign({
      name,
      subject,
      htmlContent,
      templateId: templateId || null,
      recipients: validRecipientIds,
      dailyLimit: dailyLimit || 250,
      googleSheetSource: googleSheetSource || {},
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: isDraft ? 'Draft' : (scheduledAt ? 'Scheduled' : 'Active'),
      stats: {
        totalContacts: validRecipientIds.length,
        pending: validRecipientIds.length
      },
      createdBy: req.user?._id,
      senderUserId: sender._id,
      senderName: sender.brevo.senderName,
      senderEmail: sender.brevo.senderEmail
    });

    // Save campaign FIRST, but be prepared to roll back
    await campaign.save();

    if (!isDraft && !scheduledAt) {
      const EmailLog = require('../models/EmailLog');
      
      const emailLogsToInsert = validContacts.map(contact => ({
        campaignId: campaign._id,
        contactId: contact._id,
        recipientName: contact.name || '',
        recipientEmail: contact.email,
        status: 'pending',
        retryCount: 0
      }));

      try {
        await EmailLog.insertMany(emailLogsToInsert, { ordered: false });
        console.log(`[CampaignActivation] Queue jobs created: ${emailLogsToInsert.length}`);
      } catch (insertError) {
        console.error('[CampaignActivation] Failed to create queue jobs. Rolling back campaign.', insertError);
        // Rollback campaign status to prevent misleading UI
        campaign.status = 'Failed';
        campaign.stats.pending = 0;
        await campaign.save();
        return res.status(500).json({ message: 'Campaign could not be activated because email queue creation failed.' });
      }
    }

    res.status(201).json({ 
      message: 'Campaign created successfully', 
      campaign,
      stats: {
        queued: validRecipientIds.length,
        skipped: skippedCount
      }
    });
  } catch (error) {
    console.error('Error creating email campaign:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
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

// @desc    Get queue status
// @route   GET /api/email-campaigns/queue-status
const getQueueStatus = async (req, res) => {
  try {
    const pending = await EmailLog.countDocuments({ status: 'pending' });
    const processing = await EmailLog.countDocuments({ status: 'sending' });
    const sent = await EmailLog.countDocuments({ status: 'sent' });
    const failed = await EmailLog.countDocuments({ status: 'failed' });
    const scheduled = await EmailCampaign.countDocuments({ status: 'Scheduled' });
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sentToday = await EmailLog.countDocuments({
      status: 'sent',
      sentAt: { $gte: startOfDay }
    });
    
    const dailyLimit = 250; // Ideally fetch from config

    res.json({
      pending,
      processing,
      sent,
      failed,
      scheduled,
      sentToday,
      dailyLimit,
      remainingToday: Math.max(0, dailyLimit - sentToday)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Test email provider
// @route   POST /api/email-campaigns/test-email
const sendTestEmail = async (req, res) => {
  try {
    const { to, subject, htmlContent } = req.body;
    if (!to) return res.status(400).json({ message: 'Recipient is required' });

    const { sendEmail } = require('../services/brevo.service');
    const result = await sendEmail({
      to,
      subject: subject || 'Test Email',
      htmlContent: htmlContent || '<p>This is a test email.</p>'
    });

    if (result.success) {
      res.json({
        success: true,
        recipient: to,
        provider: 'brevo',
        messageId: result.messageId,
        timestamp: new Date()
      });
    } else {
      res.status(500).json({ message: 'Provider error: ' + result.error });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Check backend health
// @route   GET /api/email-campaigns/health
const checkHealth = async (req, res) => {
  res.json({
    provider: 'brevo',
    configured: !!process.env.BREVO_API_KEY,
    queue: true,
    processor: true,
    dailyLimit: 250
  });
};

module.exports = {
  getCampaigns,
  getDashboardStats,
  createCampaign,
  getCampaignById,
  deleteCampaign,
  pauseCampaign,
  resumeCampaign,
  getQueueStatus,
  sendTestEmail,
  checkHealth,
  getSenders
};
