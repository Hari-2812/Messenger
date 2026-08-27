const mongoose = require('mongoose');

const emailCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true },
    senderName: { type: String, required: false },
    senderEmail: { type: String, required: false },
    htmlContent: { type: String, required: false }, // The final HTML sent
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
    googleSheetSource: {
      sheetId: { type: String, default: null },
      sheetName: { type: String, default: null },
      mapping: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    dailyLimit: { type: Number, default: 100 },
    timezone: { type: String, default: 'UTC' },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Active', 'Paused', 'Completed', 'Failed'],
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
      pending: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      replies: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 },
      completionPercentage: { type: Number, default: 0 },
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
