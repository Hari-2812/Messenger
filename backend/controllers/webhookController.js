/**
 * Webhook Controller — Production
 * Handles incoming webhook events from Meta WhatsApp Cloud API.
 * Processes delivery status updates: sent → delivered → read → failed.
 * Signature verification is enforced — no TEST MODE bypass.
 */

const MessageLog = require('../models/MessageLog');
const MetaProvider = require('../services/MetaProvider');

/**
 * Verify webhook token — GET request from Meta
 */
const verifyWebhook = (req, res) => {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!verifyToken) {
    console.error('[Webhook] WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured');
    return res.status(403).json({ message: 'Webhook verification failed — token not configured' });
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] ✓ Verified by Meta');
    return res.status(200).send(challenge);
  }

  console.warn('[Webhook] ✗ Verification failed — invalid token or mode');
  res.status(403).json({ message: 'Webhook verification failed' });
};

/**
 * Handle incoming POST webhook events from Meta
 * Acknowledges immediately (200 OK) then processes asynchronously
 */
const handleWebhook = async (req, res) => {
  try {
    const signature = req.get('x-hub-signature-256');
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const rawBodyString = req.rawBody || JSON.stringify(req.body);

    // ── Signature verification (enforced in production) ───────────────────
    if (!appSecret) {
      console.error('[Webhook] WHATSAPP_APP_SECRET is not set — rejecting unsigned webhook');
      return res.status(403).json({ message: 'Webhook signature verification not configured' });
    }

    const isValid = MetaProvider.verifyWebhookSignature(rawBodyString, signature, appSecret);

    if (!isValid) {
      console.warn('[Webhook] ✗ Invalid signature — possible spoofed request');
      return res.status(403).json({ message: 'Invalid webhook signature' });
    }

    // ── Acknowledge immediately (Meta requires < 5s response) ─────────────
    res.status(200).json({ received: true });

    // ── Process asynchronously ─────────────────────────────────────────────
    processWebhookAsync(req.body).catch((err) =>
      console.error('[Webhook] Async processing error:', err.message)
    );
  } catch (error) {
    console.error('[Webhook] Handler error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Process all webhook entries and changes
 */
const processWebhookAsync = async (body) => {
  if (!body?.entry) return;

  for (const entry of body.entry) {
    if (!entry.changes) continue;

    for (const change of entry.changes) {
      const value = change?.value;
      if (!value) continue;

      // ── Delivery status updates ──────────────────────────────────────────
      if (Array.isArray(value.statuses)) {
        for (const statusObj of value.statuses) {
          await handleMessageStatus(statusObj);
        }
      }

      // ── Incoming messages (replies) ──────────────────────────────────────
      if (Array.isArray(value.messages)) {
        for (const message of value.messages) {
          const from = message.from;
          const type = message.type;
          console.log(`[Webhook] Incoming ${type} message from ${from}`);
          // Future: implement reply handling / auto-response
        }
      }
    }
  }
};

/**
 * Update a MessageLog record based on Meta's delivery status callback
 * Statuses: sent → delivered → read → failed
 */
const handleMessageStatus = async (statusObj) => {
  try {
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
      // This can happen for messages sent before logging was in place — not an error
      console.log(`[Webhook] No log found for Meta ID: ${metaMessageId}`);
      return;
    }

    const statusTimestamp = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();

    messageLog.status = status;

    if (status === 'sent') messageLog.sentAt = statusTimestamp;
    else if (status === 'delivered') messageLog.deliveredAt = statusTimestamp;
    else if (status === 'read') messageLog.readAt = statusTimestamp;
    else if (status === 'failed') {
      const errMsg = errors?.[0]?.message || errors?.[0]?.error_data?.details || 'Unknown failure';
      messageLog.failureReason = errMsg;
      console.error(`[Webhook] Message failed: ${metaMessageId} | Recipient: ${recipient_id} | Reason: ${errMsg}`);
    }

    await messageLog.save();
    console.log(`[Webhook] ✓ Status updated: ${metaMessageId} → ${status}`);
  } catch (error) {
    console.error('[Webhook] Error handling status update:', error.message);
  }
};

module.exports = { verifyWebhook, handleWebhook };
