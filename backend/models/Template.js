const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    /**
     * source: 'local'  = created manually in this CRM (stored in MongoDB)
     *         'meta'   = synced from Meta Business Account (read-only reference)
     * This field differentiates local CRM templates from Meta-approved templates.
     */
    source: {
      type: String,
      enum: ['local', 'meta'],
      default: 'local',
    },
    // For Meta-synced templates only
    metaName: { type: String, default: null },    // e.g. "hello_world"
    metaStatus: { type: String, default: null },  // e.g. "APPROVED", "PENDING"
    metaLanguage: { type: String, default: null }, // e.g. "en_US"
    metaCategory: { type: String, default: null }, // e.g. "MARKETING"
  },
  { timestamps: true }
);

templateSchema.index({ source: 1 });
templateSchema.index({ metaName: 1 });

module.exports = mongoose.model('Template', templateSchema);
