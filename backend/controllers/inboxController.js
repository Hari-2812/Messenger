const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const MessageLog = require('../models/MessageLog');
const ProviderFactory = require('../services/ProviderFactory');

const getConversations = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 30);
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim();
  const filter = search
    ? { $or: [{ contactName: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }] }
    : {};

  const [conversations, total] = await Promise.all([
    Conversation.find(filter).populate('contactId', 'name email tags source').sort({ lastMessageAt: -1 }).skip(skip).limit(limit),
    Conversation.countDocuments(filter),
  ]);

  res.json({ conversations, total, page, pages: Math.ceil(total / limit) });
};

const getConversation = async (req, res) => {
  const conversation = await Conversation.findById(req.params.id).populate('contactId', 'name phone email tags source');
  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
  res.json(conversation);
};

const sendReply = async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: 'Reply text is required' });

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

  const result = await ProviderFactory.sendMessage(conversation.phone, text.trim());
  if (!result.success) return res.status(502).json({ message: result.error || 'WATI send failed' });

  const message = {
    direction: 'outbound',
    text: text.trim(),
    status: result.status || 'sent',
    provider: result.provider,
    providerMessageId: result.watiMessageId || result.metaMessageId || null,
    timestamp: new Date(),
  };

  conversation.messages.push(message);
  conversation.lastMessage = text.trim();
  conversation.lastMessageAt = new Date();
  conversation.lastMessageDirection = 'outbound';
  await conversation.save();

  if (conversation.contactId) {
    await Contact.findByIdAndUpdate(conversation.contactId, {
      lastMessageStatus: message.status,
      lastMessageAt: message.timestamp,
    });
  }

  await MessageLog.create({
    campaignId: req.body.campaignId || undefined,
    contactId: conversation.contactId,
    phone: conversation.phone,
    message: text.trim(),
    provider: result.provider,
    status: message.status,
    metaMessageId: result.metaMessageId || null,
    watiMessageId: result.watiMessageId || null,
    direction: 'outbound',
    sentAt: new Date(),
  });

  const io = req.app.get('io');
  if (io) io.to('inbox').emit('inbox:message', { conversationId: conversation._id, message });

  res.status(201).json({ conversation, message });
};

module.exports = { getConversations, getConversation, sendReply };
