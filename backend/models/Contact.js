const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
    source: { type: String, default: 'CRM', trim: true },
    whatsappStatus: {
      type: String,
      enum: ['unknown', 'synced', 'active', 'blocked', 'failed'],
      default: 'unknown',
    },
    watiContactId: { type: String, default: null },
    syncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed'],
      default: 'pending',
    },
    lastSyncedAt: { type: Date, default: null },
    lastMessageStatus: {
      type: String,
      enum: ['none', 'pending', 'accepted', 'sent', 'delivered', 'read', 'failed', 'received'],
      default: 'none',
    },
    lastMessageAt: { type: Date, default: null },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Indexes for performance
contactSchema.index({ phone: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ name: 'text', phone: 'text' }); // Text search

module.exports = mongoose.model('Contact', contactSchema);
