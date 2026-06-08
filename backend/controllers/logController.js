const MessageLog = require('../models/MessageLog');
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const Campaign = require('../models/Campaign');

const getLogs = async (req, res) => {
  try {
    const { campaignId } = req.query;
    const filter = campaignId ? { campaignId } : {};

    const logs = await MessageLog.find(filter)
      .populate('campaignId', 'campaignName')
      .populate('contactId', 'name')
      .sort({ timestamp: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [totalContacts, totalTemplates, totalCampaigns] = await Promise.all([
      Contact.countDocuments(),
      Template.countDocuments(),
      Campaign.countDocuments(),
    ]);

    // Count messages by status
    const [sentCount, deliveredCount, readCount, failedCount, pendingCount] =
      await Promise.all([
        MessageLog.countDocuments({ status: 'sent' }),
        MessageLog.countDocuments({ status: 'delivered' }),
        MessageLog.countDocuments({ status: 'read' }),
        MessageLog.countDocuments({ status: 'failed' }),
        MessageLog.countDocuments({ status: 'pending' }),
      ]);

    const recentCampaigns = await Campaign.find()
      .populate('templateId', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalContacts,
      totalTemplates,
      totalCampaigns,
      totalMessagesSent: sentCount,
      totalMessagesDelivered: deliveredCount,
      totalMessagesRead: readCount,
      totalMessagesFailed: failedCount,
      totalMessagesPending: pendingCount,
      recentCampaigns,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getLogs, getDashboardStats };
