const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

// Indexes for performance
contactSchema.index({ phone: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ name: 'text', phone: 'text' }); // Text search

module.exports = mongoose.model('Contact', contactSchema);
