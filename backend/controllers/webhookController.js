/**
 * Webhook Controller — Production
 * Handles incoming webhook events from Meta WhatsApp Cloud API.
 * Processes delivery status updates: sent → delivered → read → failed.
 *
 * Security: Signature verification uses timing-safe comparison via MetaProvider.
 */

const MessageLog = require('../models/MessageLog');
const Campaign = require('../models/Campaign');
const MetaProvider = require('../services/MetaProvider');

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
 * Also updates Campaign.failedCount when a message fails via webhook.
 * Emits real-time socket event for the Logs page.
 */
const handleMessageStatus = async (statusObj, io = null) => {
  const { id: metaMessageId, status, timestamp, recipient_id, errors } = statusObj;

  if (!metaMessageId) {
    console.warn('[Webhook] Status update missing message ID — skipping');
    return;
  }

  const validStatuses = ['sent', 'delivered', 'read', 'failed'];
  if (!validStatuses.includes(status)) {
    console.log(`[Webhook] Unhandled status "${status}" for ${metaMessageId} — skipping`);
    return;
  }

  const messageLog = await MessageLog.findOne({ metaMessageId });

  if (!messageLog) {
    console.log(`[Webhook] No log found for Meta ID: ${metaMessageId}`);
    return;
  }

  const statusTimestamp = timestamp ? new Date(parseInt(timestamp, 10) * 1000) : new Date();

  messageLog.status = status;

  if (status === 'sent') {
    messageLog.sentAt = statusTimestamp;
  } else if (status === 'delivered') {
    messageLog.deliveredAt = statusTimestamp;
  } else if (status === 'read') {
    messageLog.readAt = statusTimestamp;
  } else if (status === 'failed') {
    const errMsg =
      errors?.[0]?.message ||
      errors?.[0]?.error_data?.details ||
      'Unknown failure';
    messageLog.failureReason = errMsg;

    // Increment campaign failedCount when individual messages fail via webhook
    if (messageLog.campaignId) {
      await Campaign.findByIdAndUpdate(messageLog.campaignId, { $inc: { failedCount: 1 } });
    }

    console.error(
      `[Webhook] Message failed: ${metaMessageId} | recipient: ${recipient_id} | reason: ${errMsg}`
    );
  }

  await messageLog.save();
  console.log(`[Webhook] ✓ Status updated: ${metaMessageId} → ${status}`);

  // Emit real-time event to Logs page subscribers
  if (io) {
    io.to('logs').emit('log:status_update', {
      logId: messageLog._id,
      metaMessageId,
      status,
      deliveredAt: messageLog.deliveredAt,
      readAt: messageLog.readAt,
      failureReason: messageLog.failureReason,
    });
  }
};

module.exports = { verifyWebhook, handleWebhook };
