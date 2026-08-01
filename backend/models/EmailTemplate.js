const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true },
    htmlContent: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

emailTemplateSchema.index({ name: 'text' });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
