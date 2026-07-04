const mongoose = require('mongoose');

const conversationMessageSchema = new mongoose.Schema(
  {
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    text: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'sent', 'delivered', 'read', 'failed', 'received'],
      default: 'pending',
    },
    provider: { type: String, enum: ['meta', 'wati'], default: 'wati' },
    providerMessageId: { type: String, default: null },
    localMessageId: { type: String, default: null },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
    phone: { type: String, required: true, index: true },
    contactName: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedTeam: { type: String, default: '' },
    status: { type: String, enum: ['open', 'pending', 'closed'], default: 'open' },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessageDirection: { type: String, enum: ['inbound', 'outbound'], default: 'inbound' },
    messages: { type: [conversationMessageSchema], default: [] },
  },
  { timestamps: true }
);

conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ contactName: 'text', phone: 'text', lastMessage: 'text' });

module.exports = mongoose.model('Conversation', conversationSchema);
