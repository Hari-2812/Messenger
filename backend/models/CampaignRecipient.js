const mongoose = require('mongoose');

const campaignRecipientSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailCampaign', required: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    status: {
      type: String,
      enum: ['Pending', 'Queued', 'Sent', 'Failed', 'Replied', 'Unsubscribed', 'Bounced'],
      default: 'Pending',
    },
    attempts: { type: Number, default: 0 },
    queuedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
    lastMessageId: { type: String, default: null }, // from the provider (e.g. apps script)
  },
  { timestamps: true }
);

// Indexes for performance
campaignRecipientSchema.index({ campaignId: 1, contactId: 1 }, { unique: true }); // Prevent duplicates in the same campaign
campaignRecipientSchema.index({ campaignId: 1, status: 1 });
campaignRecipientSchema.index({ status: 1 });

module.exports = mongoose.model('CampaignRecipient', campaignRecipientSchema);
