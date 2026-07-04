const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    /**
     * source: 'local'  = created manually in this CRM (stored in MongoDB)
     *         'meta'   = synced from Meta Business Account (read-only reference)
     *         'wati'   = synced from WATI (read-only reference)
     * This field differentiates local CRM templates from Meta-approved templates.
     */
    source: {
      type: String,
      enum: ['local', 'meta', 'wati'],
      default: 'local',
    },
    // For Meta-synced templates only
    metaName: { type: String, default: null },    // e.g. "hello_world"
    metaStatus: { type: String, default: null },  // e.g. "APPROVED", "PENDING"
    metaLanguage: { type: String, default: null }, // e.g. "en_US"
    metaCategory: { type: String, default: null }, // e.g. "MARKETING"
    watiTemplateId: { type: String, default: null },
    watiStatus: { type: String, default: null },
    watiRaw: { type: mongoose.Schema.Types.Mixed, default: null },
    header: { type: String, default: null },
    body: { type: String, default: null },
    footer: { type: String, default: null },
    buttons: { type: [mongoose.Schema.Types.Mixed], default: [] },
    variables: { type: [String], default: [] },
    category: { type: String, default: null },
    language: { type: String, default: null },
    templateStatus: { type: String, default: null },
    variableCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

templateSchema.index({ source: 1 });
templateSchema.index({ metaName: 1 });

module.exports = mongoose.model('Template', templateSchema);
