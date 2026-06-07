const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    campaignName: { type: String, required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },
    contactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    totalContacts: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'sending', 'completed', 'failed'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
