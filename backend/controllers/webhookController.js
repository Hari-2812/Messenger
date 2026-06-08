/**
 * Webhook Controller
 * Handles incoming webhook events from Meta WhatsApp Cloud API
 */

const MessageLog = require('../models/MessageLog');
const MetaProvider = require('../services/MetaProvider');

/**
 * Verify webhook token (GET request)
 * Meta sends a GET request to verify the webhook endpoint
 */
const verifyWebhook = (req, res) => {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!verifyToken) {
    console.error('WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured');
    return res.status(403).json({ message: 'Webhook verification failed' });
  }

  if (mode && token && mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn('Webhook verification failed - invalid token or mode');
  res.status(403).json({ message: 'Webhook verification failed' });
};

/**
 * Handle incoming webhook events from Meta
 * Updates message status based on delivery callbacks
 */
const handleWebhook = async (req, res) => {
  try {
    // Verify signature
    const signature = req.get('x-hub-signature-256');
    const rawBody = req.body;
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!appSecret) {
      console.error('WHATSAPP_APP_SECRET is not configured');
      return res.status(403).json({ message: 'Webhook signature verification failed' });
    }

    // Convert body to raw JSON string for signature verification
    const rawBodyString = JSON.stringify(rawBody);
    const isValidSignature = MetaProvider.verifyWebhookSignature(
      rawBodyString,
      signature,
      appSecret
    );

    if (!isValidSignature) {
      console.warn('Invalid webhook signature received');
      return res.status(403).json({ message: 'Invalid signature' });
    }

    // Acknowledge receipt immediately
    res.status(200).json({ received: true });

    // Process webhook asynchronously
    processWebhookAsync(rawBody);
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Process webhook events asynchronously
 * Handles message status updates
 */
const processWebhookAsync = async (body) => {
  try {
    // Meta webhook structure: { entry: [ { changes: [ { value: { messages, statuses } } ] } ] }
    if (!body.entry) {
      return;
    }

    for (const entry of body.entry) {
      if (!entry.changes) continue;

      for (const change of entry.changes) {
        const value = change.value;

        // Handle message status updates
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            await handleMessageStatus(status);
          }
        }

        // Handle incoming messages (for future features like replies)
        if (value.messages && Array.isArray(value.messages)) {
          for (const message of value.messages) {
            console.log('Incoming message:', message);
            // Could implement reply handling here
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing webhook:', error.message);
  }
};

/**
 * Handle individual message status update
 * @param {Object} statusObject - Status object from Meta webhook
 */
const handleMessageStatus = async (statusObject) => {
  try {
    const { id: metaMessageId, status, timestamp, recipient_id } = statusObject;

    if (!metaMessageId) {
      console.warn('No message ID in status object');
      return;
    }

    // Map Meta status to our status enum
    const statusMap = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
    };

    const mappedStatus = statusMap[status] || status;

    // Find message log by Meta message ID
    const messageLog = await MessageLog.findOne({ metaMessageId });

    if (!messageLog) {
      console.warn(`Message log not found for Meta message ID: ${metaMessageId}`);
      return;
    }

    // Update message status
    messageLog.status = mappedStatus;

    // Set timestamp based on status
    const statusTimestamp = new Date(parseInt(timestamp) * 1000);
    if (status === 'sent') {
      messageLog.sentAt = statusTimestamp;
    } else if (status === 'delivered') {
      messageLog.deliveredAt = statusTimestamp;
    } else if (status === 'read') {
      messageLog.readAt = statusTimestamp;
    } else if (status === 'failed') {
      messageLog.failureReason = statusObject.errors?.[0]?.message || 'Unknown error';
    }

    await messageLog.save();
    console.log(`Updated message status: ${metaMessageId} -> ${mappedStatus}`);
  } catch (error) {
    console.error('Error handling message status:', error.message);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook,
};
