const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const MessageLog = require('../models/MessageLog');

const percentage = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

const getAnalytics = async (req, res) => {
  const [statusAgg, campaignAgg, replies, totalContacts, recentCampaigns] = await Promise.all([
    MessageLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Campaign.aggregate([
      {
        $group: {
          _id: null,
          totalCampaigns: { $sum: 1 },
          totalContacts: { $sum: '$totalContacts' },
          sentCount: { $sum: '$sentCount' },
          deliveredCount: { $sum: '$deliveredCount' },
          readCount: { $sum: '$readCount' },
          failedCount: { $sum: '$failedCount' },
          replyCount: { $sum: '$replyCount' },
        },
      },
    ]),
    Conversation.countDocuments({ lastMessageDirection: 'inbound' }),
    Contact.countDocuments(),
    Campaign.find().sort({ createdAt: -1 }).limit(8),
  ]);

  const statusMap = statusAgg.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
  const sent = (statusMap.sent || 0) + (statusMap.accepted || 0) + (statusMap.delivered || 0) + (statusMap.read || 0);
  const delivered = (statusMap.delivered || 0) + (statusMap.read || 0);
  const read = statusMap.read || 0;
  const failed = statusMap.failed || 0;

  res.json({
    totalContacts,
    totalMessagesSent: sent,
    delivered,
    read,
    failed,
    customerReplies: replies,
    deliveredRate: percentage(delivered, sent),
    readRate: percentage(read, sent),
    failedRate: percentage(failed, sent + failed),
    conversionRate: percentage(replies, sent),
    campaignTotals: campaignAgg[0] || {},
    recentCampaigns,
    byStatus: statusMap,
  });
};

module.exports = { getAnalytics };
