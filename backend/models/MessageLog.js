const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
    phone: { type: String, required: true },
    // message is optional — template sends use the Meta template name instead of message text
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
    },
    // Meta WhatsApp message ID returned from the Cloud API (used for delivery tracking)
    metaMessageId: { type: String, default: null },
    watiMessageId: { type: String, default: null },
    localMessageId: { type: String, default: null },
    provider: { type: String, default: 'meta', enum: ['meta', 'wati'] },
    direction: { type: String, enum: ['inbound', 'outbound'], default: 'outbound' },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for fast delivery status lookups via webhook
messageLogSchema.index({ metaMessageId: 1 });
messageLogSchema.index({ watiMessageId: 1 });
messageLogSchema.index({ localMessageId: 1 });
messageLogSchema.index({ campaignId: 1, status: 1 });
messageLogSchema.index({ campaignId: 1, createdAt: -1 }); // Paginated log queries
messageLogSchema.index({ status: 1, sentAt: 1 });         // Delivery timeout job

module.exports = mongoose.model('MessageLog', messageLogSchema);
