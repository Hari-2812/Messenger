const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, default: '', trim: true },
    companyName: { type: String, default: '', trim: true },
    website: { type: String, default: '', trim: true },
    industry: { type: String, default: '', trim: true },
    location: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
    source: { type: String, default: 'CRM', trim: true },
    campaign: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['New', 'Pending', 'Queued', 'Sent', 'Failed', 'Replied', 'Unsubscribed', 'Bounced', 'Completed'],
      default: 'New',
    },
    lastContacted: { type: Date, default: null },
    nextFollowUp: { type: Date, default: null },
    
    // Legacy WhatsApp fields
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
    syncError: { type: String, default: null },
    lastMessageStatus: {
      type: String,
      enum: ['none', 'pending', 'accepted', 'sent', 'delivered', 'read', 'failed', 'received'],
      default: 'none',
    },
    lastMessageAt: { type: Date, default: null },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes for performance
contactSchema.index({ email: 1 });
contactSchema.index({ phone: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ name: 'text', email: 'text', phone: 'text' }); // Text search

module.exports = mongoose.model('Contact', contactSchema);
