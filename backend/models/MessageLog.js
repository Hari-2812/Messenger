const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
    },
    metaMessageId: { type: String, default: null },
    provider: { type: String, default: 'meta', enum: ['meta', 'mock'] },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MessageLog', messageLogSchema);
