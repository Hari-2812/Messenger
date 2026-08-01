const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailCampaign', required: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    recipientName: { type: String },
    recipientEmail: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'bounce', 'opened', 'clicked'],
      default: 'pending',
    },
    messageId: { type: String, default: null }, // From Brevo
    sentAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
    failedReason: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

emailLogSchema.index({ campaignId: 1, status: 1 });
emailLogSchema.index({ messageId: 1 }); // For webhook matching
emailLogSchema.index({ status: 1, retryCount: 1 }); // For cron queue

module.exports = mongoose.model('EmailLog', emailLogSchema);
