const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    campaignName: { type: String, required: true, trim: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
    // Meta WhatsApp template name (e.g. "hello_world") — stored so we don't hardcode it
    metaTemplateName: { type: String, default: null },
    metaTemplateLanguage: { type: String, default: 'en_US' },
    contactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    totalContacts: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    status: {
      type: String,
      // partial = some sent, some failed
      enum: ['draft', 'sending', 'completed', 'partial', 'failed'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

// Indexes for performance
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ metaTemplateName: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
