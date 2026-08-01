const mongoose = require('mongoose');

const emailCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true },
    senderName: { type: String, required: true },
    senderEmail: { type: String, required: true },
    htmlContent: { type: String, required: true }, // The final HTML sent
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Sending', 'Completed', 'Failed'],
      default: 'Draft',
    },
    scheduledAt: { type: Date, default: null },
    attachments: [
      {
        url: { type: String, required: true },
        name: { type: String, required: true },
      },
    ],
    stats: {
      totalContacts: { type: Number, default: 0 },
      totalSent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      bounce: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    error: { type: String, default: null }, // Global error if campaign fails entirely
  },
  { timestamps: true }
);

// Indexes for performance
emailCampaignSchema.index({ status: 1 });
emailCampaignSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema);
