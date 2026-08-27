const EmailCampaign = require('../models/EmailCampaign');
const CampaignRecipient = require('../models/CampaignRecipient');
const Contact = require('../models/Contact');
const EmailLog = require('../models/EmailLog');

// @desc    Get pending contacts for a campaign up to daily limit
// @route   GET /api/apps-script/campaigns/:id/queue
exports.getPendingQueue = async (req, res) => {
  try {
    const campaignId = req.params.id;
    const campaign = await EmailCampaign.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    if (campaign.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Campaign is not active' });
    }

    // Check daily limit progress
    // In a real app we'd check how many emails were sent *today* for this specific campaign.
    // For simplicity, we assume apps script asks for a batch. We limit the batch.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sentTodayCount = await CampaignRecipient.countDocuments({
      campaignId,
      status: 'Sent',
      sentAt: { $gte: startOfDay }
    });

    const remainingToday = Math.max(0, campaign.dailyLimit - sentTodayCount);

    if (remainingToday === 0) {
      return res.json({ success: true, message: 'Daily limit reached', queue: [] });
    }

    const pendingRecipients = await CampaignRecipient.find({
      campaignId,
      status: 'Pending'
    }).limit(remainingToday).populate('contactId');

    // Apps Script needs the template and contact info to personalize the email
    const template = await require('../models/EmailTemplate').findById(campaign.templateId);

    const queueData = pendingRecipients.map(r => ({
      recipientId: r._id,
      contact: r.contactId,
      template: {
        subject: template ? template.subject : campaign.subject,
        htmlContent: template ? template.htmlContent : campaign.htmlContent
      }
    }));

    res.json({ success: true, queue: queueData, remainingToday });
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Update status of an email sent by Apps Script
// @route   POST /api/apps-script/campaigns/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const campaignId = req.params.id;
    const { recipientId, status, errorMessage, messageId } = req.body;

    const recipient = await CampaignRecipient.findOne({ _id: recipientId, campaignId });
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found in this campaign' });
    }

    recipient.status = status;
    recipient.attempts += 1;
    if (status === 'Sent') {
      recipient.sentAt = new Date();
    } else if (status === 'Failed') {
      recipient.failedAt = new Date();
      recipient.errorMessage = errorMessage;
    }
    
    if (messageId) {
      recipient.lastMessageId = messageId;
    }

    await recipient.save();

    // Update campaign stats
    const campaign = await EmailCampaign.findById(campaignId);
    if (status === 'Sent') {
      campaign.stats.totalSent += 1;
      campaign.stats.pending = Math.max(0, campaign.stats.pending - 1);
    } else if (status === 'Failed') {
      campaign.stats.failed += 1;
      campaign.stats.pending = Math.max(0, campaign.stats.pending - 1);
    }
    
    // Update contact status
    const contact = await Contact.findById(recipient.contactId);
    if (contact) {
      contact.status = status;
      contact.lastContacted = new Date();
      contact.campaign = campaign.name;
      await contact.save();
    }

    await campaign.save();

    // Create Email Log
    await EmailLog.create({
      campaignId,
      contactId: contact._id,
      recipientName: contact.name,
      recipientEmail: contact.email,
      status: status,
      failureReason: errorMessage,
      sentAt: status === 'Sent' ? new Date() : null,
      messageId: messageId
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
