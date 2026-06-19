const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    campaignName: { type: String, required: true, trim: true },

    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      default: null,
    },

    // ── Meta Template ──────────────────────────────────────────────────────────
    // Template name as registered in Meta Business Manager (e.g. "hello_world")
    metaTemplateName: { type: String, default: null },
    metaTemplateLanguage: { type: String, default: 'en_US' },

    // Body text snapshot — used for preview in logs (not sent to Meta)
    metaTemplateBodyText: { type: String, default: null },

    // ── Template Variable Mapping ──────────────────────────────────────────────
    // Maps {{1}}, {{2}}, {{3}} → contact field names in order
    // e.g. ['name', 'phone'] means {{1}}=contact.name, {{2}}=contact.phone
    templateVariables: { type: [String], default: [] },

    // Number of {{n}} placeholders in the template body
    // Must match parameters.length sent to Meta API — prevents #132000 error
    templateParamCount: { type: Number, default: 0 },

    // ── Recipients ─────────────────────────────────────────────────────────────
    contactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    totalContacts: { type: Number, default: 0 },

    // ── Results ────────────────────────────────────────────────────────────────
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },

    // ── Status ─────────────────────────────────────────────────────────────────
    // partial = some sent, some failed
    status: {
      type: String,
      enum: ['draft', 'sending', 'completed', 'partial', 'failed'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ metaTemplateName: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);