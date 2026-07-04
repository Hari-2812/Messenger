/**
 * Webhook Controller — Production
 * Handles incoming webhook events from Meta WhatsApp Cloud API.
 * Processes delivery status updates: sent → delivered → read → failed.
 *
 * Security: Signature verification uses timing-safe comparison via MetaProvider.
 */

const MessageLog = require('../models/MessageLog');
const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const MetaProvider = require('../services/MetaProvider');
const WatiService = require('../services/watiService');

/**
 * GET /api/webhooks/meta
 * Webhook verification challenge from Meta
 */
const verifyWebhook = (req, res) => {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!verifyToken) {
    console.error('[Webhook] WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured');
    return res.status(403).json({ message: 'Webhook verification not configured' });
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] ✓ Verified by Meta');
    return res.status(200).send(challenge);
  }

  console.warn('[Webhook] ✗ Verification failed — invalid token or mode');
  res.status(403).json({ message: 'Webhook verification failed' });
};

const verifyWatiWebhook = (req, res) => {
  const token = req.query.token || req.query.verify_token || req.query['hub.verify_token'];
  const challenge = req.query.challenge || req.query['hub.challenge'] || 'ok';

  if (token && token === process.env.WATI_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.status(403).json({ message: 'WATI webhook verification failed' });
};

const handleWatiWebhook = async (req, res) => {
  const rawBodyString = req.rawBody || JSON.stringify(req.body);
  const signature = req.get('x-wati-signature') || req.get('x-hub-signature-256');
  const valid = WatiService.verifyWebhookSignature(rawBodyString, signature, process.env.WATI_WEBHOOK_SECRET);

  if (!valid) return res.status(403).json({ message: 'Invalid WATI webhook signature' });

  res.status(200).json({ received: true });
  const io = req.app.get('io');
  processWatiWebhookAsync(req.body, io).catch((err) =>
    console.error('[WATI Webhook] Async processing error:', err.message)
  );
};

/**
 * POST /api/webhooks/meta
 * Delivery status and incoming message events from Meta
 */
const handleWebhook = async (req, res) => {
  const signature = req.get('x-hub-signature-256');
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const rawBodyString = req.rawBody || JSON.stringify(req.body);

  if (!appSecret) {
    console.error('[Webhook] WHATSAPP_APP_SECRET not set — rejecting request');
    return res.status(403).json({ message: 'Webhook signature verification not configured' });
  }

  const isValid = MetaProvider.verifyWebhookSignature(rawBodyString, signature, appSecret);

  if (!isValid) {
    console.warn('[Webhook] ✗ Invalid signature — possible spoofed request');
    return res.status(403).json({ message: 'Invalid webhook signature' });
  }

  console.log('[Webhook] EVENT:', JSON.stringify(req.body, null, 2));

  // Acknowledge immediately (Meta requires < 5s response)
  res.status(200).json({ received: true });

  // Process asynchronously — don't block the response
  const io = req.app.get('io');
  processWebhookAsync(req.body, io).catch((err) =>
    console.error('[Webhook] Async processing error:', err.message)
  );
};

/**
 * Process all webhook entries and changes asynchronously
 */
const processWebhookAsync = async (body, io = null) => {
  if (!body?.entry) return;

  for (const entry of body.entry) {
    if (!entry.changes) continue;

    for (const change of entry.changes) {
      const value = change?.value;
      if (!value) continue;

      // Delivery status updates
      if (Array.isArray(value.statuses)) {
        for (const statusObj of value.statuses) {
          await handleMessageStatus(statusObj, io);
        }
      }

      // Incoming messages (replies from contacts)
      if (Array.isArray(value.messages)) {
        for (const message of value.messages) {
          console.log(`[Webhook] Incoming ${message.type} message from ${message.from}`);
          // Future: implement reply handling / auto-response
        }
      }
    }
  }
};

/**
 * Update a MessageLog record based on Meta's delivery status callback.
 * Also updates Campaign counts when a message status changes.
 * Emits real-time socket events for Logs and Campaign pages.
 */
const handleMessageStatus = async (statusObj, io = null) => {
  const { id: metaMessageId, status, timestamp, errors } = statusObj;

  if (!metaMessageId) {
    console.warn('[Webhook] Status update missing message ID — skipping');
    return;
  }

  const validStatuses = ['accepted', 'sent', 'delivered', 'read', 'failed'];
  if (!validStatuses.includes(status)) {
    console.log(`[Webhook] Unhandled status "${status}" for ${metaMessageId} — skipping`);
    return;
  }

  const messageLog = await MessageLog.findOne({ metaMessageId });

  if (!messageLog) {
    console.log(`[Webhook] No log found for Meta ID: ${metaMessageId}`);
    return;
  }

  const statusTimestamp = timestamp
    ? new Date(parseInt(timestamp, 10) * 1000)
    : new Date();

  messageLog.status = status;

  if (status === 'sent') {
    messageLog.sentAt = statusTimestamp;
  } else if (status === 'delivered') {
    messageLog.deliveredAt = statusTimestamp;
  } else if (status === 'read') {
    messageLog.readAt = statusTimestamp;
  } else if (status === 'failed') {
    // ← This closing brace was missing — caused "Unexpected end of input"
    const errMsg =
      errors?.[0]?.message ||
      errors?.[0]?.error_data?.details ||
      'Unknown failure';
    messageLog.failureReason = errMsg;
  }

  await messageLog.save();
  console.log(`[Webhook] ✓ Status updated: ${metaMessageId} → ${status}`);

  // Update parent Campaign status and counts
  if (messageLog.campaignId) {
    try {
      const allLogs = await MessageLog.find({ campaignId: messageLog.campaignId });
      const totalCount    = allLogs.length;
      const failedCount   = allLogs.filter((l) => l.status === 'failed').length;
      const successCount  = allLogs.filter((l) =>
        ['sent', 'delivered', 'read'].includes(l.status)
      ).length;
      const inProgressCount = allLogs.filter((l) =>
        ['pending', 'accepted'].includes(l.status)
      ).length;

      let finalCampaignStatus = 'sending';
      if (inProgressCount === 0) {
        if (failedCount === totalCount) {
          finalCampaignStatus = 'failed';
        } else if (failedCount > 0) {
          finalCampaignStatus = 'partial';
        } else {
          finalCampaignStatus = 'completed';
        }
      }

      await Campaign.findByIdAndUpdate(messageLog.campaignId, {
        status:      finalCampaignStatus,
        sentCount:   successCount,
        failedCount: failedCount,
      });

      console.log(
        `[Webhook] Updated Campaign ${messageLog.campaignId} → ${finalCampaignStatus} ` +
        `(success: ${successCount}, failed: ${failedCount}, remaining: ${inProgressCount})`
      );

      // Real-time progress update for Campaign page
      if (io) {
        io.to(`campaign:${messageLog.campaignId}`).emit('campaign:progress', {
          campaignId: messageLog.campaignId,
          sent:       successCount,
          failed:     failedCount,
          total:      totalCount,
          percent:    Math.round(((successCount + failedCount) / totalCount) * 100),
          status:     finalCampaignStatus,
        });
      }
    } catch (campaignErr) {
      console.error(
        '[Webhook] Failed to update parent campaign stats:',
        campaignErr.message
      );
    }
  }

  // Real-time update for Logs page
  if (io) {
    io.to('logs').emit('log:status_update', {
      logId:          messageLog._id,
      metaMessageId,
      status,
      deliveredAt:    messageLog.deliveredAt,
      readAt:         messageLog.readAt,
      failureReason:  messageLog.failureReason,
    });
  }
};

const normalizeWatiStatus = (eventType, payloadStatus) => {
  const value = String(payloadStatus || eventType || '').toLowerCase();
  if (value.includes('deliver')) return 'delivered';
  if (value.includes('read')) return 'read';
  if (value.includes('fail')) return 'failed';
  if (value.includes('sent')) return 'sent';
  if (value.includes('received') || value.includes('reply')) return 'received';
  return 'sent';
};

const getWatiMessageId = (payload) =>
  payload.localMessageId ||
  payload.local_message_id ||
  payload.messageId ||
  payload.message_id ||
  payload.id ||
  payload.watiMessageId ||
  payload.data?.localMessageId ||
  payload.data?.messageId;

const processWatiWebhookAsync = async (body, io = null) => {
  const events = Array.isArray(body) ? body : [body];

  for (const event of events) {
    const eventType = event.eventType || event.type || event.event || event.webhookType;
    const data = event.data || event;
    const status = normalizeWatiStatus(eventType, data.status);

    if (status === 'received') {
      await handleWatiIncoming(data, io);
    } else {
      await handleWatiStatus(data, status, io);
    }
  }
};

const handleWatiStatus = async (data, status, io = null) => {
  const messageId = getWatiMessageId(data);
  if (!messageId) return;

  const messageLog = await MessageLog.findOne({
    $or: [{ watiMessageId: messageId }, { localMessageId: messageId }, { metaMessageId: messageId }],
  });
  if (!messageLog) return;

  const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
  messageLog.status = status;
  if (status === 'sent') messageLog.sentAt = timestamp;
  if (status === 'delivered') messageLog.deliveredAt = timestamp;
  if (status === 'read') messageLog.readAt = timestamp;
  if (status === 'failed') messageLog.failureReason = data.error || data.errorMessage || data.reason || 'WATI delivery failed';
  await messageLog.save();

  await Contact.findByIdAndUpdate(messageLog.contactId, {
    lastMessageStatus: status,
    lastMessageAt: timestamp,
  });

  await updateCampaignCounters(messageLog.campaignId, io);

  const conversation = await Conversation.findOne({ phone: messageLog.phone });
  if (conversation) {
    const message = conversation.messages.find(
      (m) => m.localMessageId === messageLog.localMessageId || m.providerMessageId === messageId
    );
    if (message) message.status = status;
    await conversation.save();
    if (io) io.to('inbox').emit('inbox:status', { conversationId: conversation._id, messageId, status });
  }
};

const handleWatiIncoming = async (data, io = null) => {
  const phone = WatiService.normalizePhone(data.waId || data.phone || data.phoneNumber || data.from || data.sender);
  if (!phone) return;

  let contact = await Contact.findOne({ phone });
  if (!contact) {
    contact = await Contact.create({
      name: data.senderName || data.name || phone,
      phone,
      source: 'WATI',
      whatsappStatus: 'active',
      lastMessageStatus: 'received',
      lastMessageAt: new Date(),
    });
  } else {
    contact.lastMessageStatus = 'received';
    contact.lastMessageAt = new Date();
    contact.whatsappStatus = 'active';
    await contact.save();
  }

  const text = data.text || data.message || data.body || data.content || '';
  const messageId = getWatiMessageId(data);
  const conversation = await Conversation.findOneAndUpdate(
    { phone },
    {
      $set: {
        contactId: contact._id,
        phone,
        contactName: contact.name,
        lastMessage: text,
        lastMessageAt: new Date(),
        lastMessageDirection: 'inbound',
        status: 'open',
      },
      $push: {
        messages: {
          direction: 'inbound',
          text,
          status: 'received',
          provider: 'wati',
          providerMessageId: messageId,
          raw: data,
          timestamp: new Date(),
        },
      },
    },
    { upsert: true, new: true }
  );

  await MessageLog.create({
    contactId: contact._id,
    phone,
    message: text,
    status: 'read',
    provider: 'wati',
    direction: 'inbound',
    watiMessageId: messageId,
    timestamp: new Date(),
  });

  await Campaign.updateMany({ contactIds: contact._id }, { $inc: { replyCount: 1 } });

  if (io) {
    io.to('inbox').emit('inbox:message', { conversationId: conversation._id, message: conversation.messages.at(-1) });
  }
};

const updateCampaignCounters = async (campaignId, io = null) => {
  if (!campaignId) return;
  const logs = await MessageLog.find({ campaignId });
  const sentCount = logs.filter((l) => ['accepted', 'sent', 'delivered', 'read'].includes(l.status)).length;
  const deliveredCount = logs.filter((l) => ['delivered', 'read'].includes(l.status)).length;
  const readCount = logs.filter((l) => l.status === 'read').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;
  const pendingCount = logs.filter((l) => ['pending', 'accepted'].includes(l.status)).length;

  const status = pendingCount > 0 ? 'sending' : failedCount === logs.length ? 'failed' : failedCount > 0 ? 'partial' : 'completed';
  await Campaign.findByIdAndUpdate(campaignId, {
    sentCount,
    deliveredCount,
    readCount,
    failedCount,
    status,
  });

  if (io) {
    io.to(`campaign:${campaignId}`).emit('campaign:progress', {
      campaignId,
      sent: sentCount,
      delivered: deliveredCount,
      read: readCount,
      failed: failedCount,
      total: logs.length,
      percent: Math.round(((sentCount + failedCount) / Math.max(logs.length, 1)) * 100),
      status,
    });
  }
};

module.exports = { verifyWebhook, handleWebhook, verifyWatiWebhook, handleWatiWebhook };
