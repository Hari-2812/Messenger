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
    const { name, subject, htmlContent, templateId, scheduledAt, isDraft, dailyLimit, googleSheetSource } = req.body;
    
    // We assume the user can optionally pass recipients
    let { recipients } = req.body; 
    
    if (typeof recipients === 'string') {
      try { recipients = JSON.parse(recipients); } catch(e) {}
    }
    
    // If no specific recipients, get all active contacts with an email address
    if (!recipients || recipients.length === 0) {
      const contacts = await Contact.find({ 
        email: { $ne: '' }, 
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
      email: { $ne: '' },
      isDeleted: { $ne: true },
      status: { $ne: 'Unsubscribed' }
    }).select('_id');

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
      dailyLimit: dailyLimit || 100,
      googleSheetSource: googleSheetSource || {},
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: isDraft ? 'Draft' : (scheduledAt ? 'Scheduled' : 'Active'),
      stats: {
        totalContacts: validRecipientIds.length,
        pending: validRecipientIds.length
      },
      createdBy: req.user?._id
    });

    await campaign.save();

    if (!isDraft && !scheduledAt) {
      // Enqueue to CampaignRecipient
      const CampaignRecipient = require('../models/CampaignRecipient');
      const recipientsToInsert = validRecipientIds.map(contactId => ({
        campaignId: campaign._id,
        contactId: contactId,
        status: 'Pending'
      }));

      await CampaignRecipient.insertMany(recipientsToInsert, { ordered: false });
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

module.exports = {
  getCampaigns,
  getDashboardStats,
  createCampaign,
  getCampaignById,
  deleteCampaign,
  pauseCampaign,
  resumeCampaign
};
