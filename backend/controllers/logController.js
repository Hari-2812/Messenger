const MessageLog = require('../models/MessageLog');
const Campaign = require('../models/Campaign');

// @desc    Get message logs (paginated)
// @route   GET /api/logs
const getLogs = async (req, res) => {
  const { campaignId } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const skip = (page - 1) * limit;

  const filter = campaignId ? { campaignId } : {};

  const [logs, total] = await Promise.all([
    MessageLog.find(filter)
      .populate('campaignId', 'campaignName')
      .populate('contactId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit),
    MessageLog.countDocuments(filter),
  ]);

  res.json({ logs, total, page, pages: Math.ceil(total / limit) });
};

// @desc    Get dashboard statistics
// @route   GET /api/logs/dashboard
const getDashboardStats = async (req, res) => {
  // Single aggregation pipeline — replaces 8 separate countDocuments calls
  const [messageStats, entityCounts, recentCampaigns] = await Promise.all([
    MessageLog.aggregate([
      {
        $facet: {
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          total: [{ $count: 'count' }],
        },
      },
    ]),
    Promise.all([
      Campaign.countDocuments(),
      // Count contacts via Contact model directly
      require('../models/Contact').countDocuments(),
      require('../models/Template').countDocuments({ source: 'local' }),
    ]),
    Campaign.find()
      .populate('templateId', 'title source')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  // Flatten message status counts
  const statusMap = {};
  (messageStats[0]?.byStatus || []).forEach(({ _id, count }) => {
    statusMap[_id] = count;
  });

  const [totalCampaigns, totalContacts, totalLocalTemplates] = entityCounts;

  res.json({
    totalContacts,
    totalLocalTemplates,
    totalCampaigns,
    totalMessagesSent: statusMap.sent || 0,
    totalMessagesDelivered: statusMap.delivered || 0,
    totalMessagesRead: statusMap.read || 0,
    totalMessagesFailed: statusMap.failed || 0,
    totalMessagesPending: (statusMap.pending || 0) + (statusMap.accepted || 0),
    totalMessages: messageStats[0]?.total?.[0]?.count || 0,
    recentCampaigns,
  });
};

module.exports = { getLogs, getDashboardStats };
