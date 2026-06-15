/**
 * Campaign Queue Service — Production
 *
 * Handles bulk Meta WhatsApp template message sending with:
 *  - Concurrency control (batched parallel sends)
 *  - Detailed per-message logging (MessageLog)
 *  - Real-time socket.io progress events
 *  - Partial campaign status support
 *
 * Privacy: Phone numbers are NEVER logged individually.
 */

const Campaign = require('../models/Campaign');
const MessageLog = require('../models/MessageLog');
const ProviderFactory = require('./ProviderFactory');

/**
 * Send a single template message and write a MessageLog entry.
 */
const sendSingleMessage = async (item) => {
  const { phone, contactId, campaignId, templateName, templateLanguage, parameters, previewMessage } = item;

  try {
    if (!templateName) {
      throw new Error('No Meta template name specified');
    }

    const result = await ProviderFactory.sendTemplateMessage(
      phone,
      templateName,
      parameters || [],
      templateLanguage || 'en_US'
    );

    const logEntry = {
      campaignId,
      contactId,
      phone,
      message: previewMessage || `[Meta Template: ${templateName}]`,
      provider: 'meta',
      status: result.success ? 'sent' : 'failed',
      sentAt: result.sentAt || (result.success ? new Date() : null),
      failureReason: result.error || null,
    };

    if (result.metaMessageId) {
      logEntry.metaMessageId = result.metaMessageId;
    }

    await MessageLog.create(logEntry);

    return { success: result.success, error: result.error || null };
  } catch (error) {
    console.error(`[CampaignQueue] Exception sending to contact ${contactId}: ${error.message}`);

    await MessageLog.create({
      campaignId,
      contactId,
      phone,
      message: previewMessage || `[Meta Template: ${templateName || 'unknown'}]`,
      provider: 'meta',
      status: 'failed',
      failureReason: error.message,
    });

    return { success: false, error: error.message };
  }
};

/**
 * Send messages with concurrency control
 * Emits socket.io events for real-time progress
 */
const sendWithConcurrency = async (items, concurrency = 5, io = null, campaignId = null) => {
  const results = { sent: 0, failed: 0, errors: [] };
  const total = items.length;

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map((item) => sendSingleMessage(item)));

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        result.value.success ? results.sent++ : results.failed++;
        if (!result.value.success) results.errors.push(result.value.error);
      } else {
        results.failed++;
        results.errors.push(result.reason?.message || 'Unknown error');
      }
    }

    // Emit real-time progress via socket.io
    if (io && campaignId) {
      const progress = Math.round(((results.sent + results.failed) / total) * 100);
      io.to(`campaign:${campaignId}`).emit('campaign:progress', {
        campaignId,
        sent: results.sent,
        failed: results.failed,
        total,
        percent: progress,
      });
    }
  }

  return results;
};

/**
 * Process a campaign — prepare all message items and send with concurrency control.
 * Called in background (setImmediate) from campaignController.
 * Emits campaign:completed / campaign:failed socket events when done.
 *
 * @param {Object} campaign - Campaign Mongoose document
 * @param {Object|null} template - Local Template document (optional, preview only)
 * @param {Array} contacts - Array of Contact documents
 * @param {Object|null} io - socket.io server instance
 */
const processCampaignWithQueue = async (campaign, template, contacts, io = null) => {
  const concurrency = parseInt(process.env.CAMPAIGN_CONCURRENCY || '5', 10);

  if (!campaign.metaTemplateName) {
    const errMsg = `Campaign "${campaign.campaignName}" has no Meta template. Cannot send.`;
    console.error(`[CampaignQueue] ✗ ${errMsg}`);
    campaign.status = 'failed';
    await campaign.save();

    if (io) {
      io.to(`campaign:${campaign._id}`).emit('campaign:failed', {
        campaignId: campaign._id,
        error: errMsg,
      });
    }
    return;
  }

  console.log(
    `[CampaignQueue] Starting campaign "${campaign.campaignName}" | ` +
    `template: ${campaign.metaTemplateName} | recipients: ${contacts.length} | concurrency: ${concurrency}`
  );

  // Build send items — no PII phone numbers in logs
  const items = contacts.map((contact) => ({
    phone: contact.phone,
    contactId: contact._id,
    campaignId: campaign._id,
    templateName: campaign.metaTemplateName,
    templateLanguage: campaign.metaTemplateLanguage || 'en_US',
    parameters: [],
    previewMessage: `[Template: ${campaign.metaTemplateName}]`,
  }));

  try {
    const results = await sendWithConcurrency(items, concurrency, io, campaign._id.toString());

    // Determine final status
    let finalStatus;
    if (results.sent === 0) {
      finalStatus = 'failed';
    } else if (results.failed > 0) {
      finalStatus = 'partial'; // Some sent, some failed
    } else {
      finalStatus = 'completed';
    }

    campaign.sentCount = results.sent;
    campaign.failedCount = results.failed;
    campaign.status = finalStatus;
    await campaign.save();

    console.log(
      `[CampaignQueue] ✓ Done: "${campaign.campaignName}" | ` +
      `sent: ${results.sent} | failed: ${results.failed} | status: ${finalStatus}`
    );

    if (results.errors.length > 0) {
      console.error(`[CampaignQueue] Errors (first 5):`, results.errors.slice(0, 5));
    }

    // Emit completion event
    if (io) {
      io.to(`campaign:${campaign._id}`).emit('campaign:completed', {
        campaignId: campaign._id,
        status: finalStatus,
        sentCount: results.sent,
        failedCount: results.failed,
        total: contacts.length,
      });
    }

    return results;
  } catch (error) {
    console.error(`[CampaignQueue] Fatal error for campaign ${campaign._id}: ${error.message}`);
    campaign.status = 'failed';
    await campaign.save();

    if (io) {
      io.to(`campaign:${campaign._id}`).emit('campaign:failed', {
        campaignId: campaign._id,
        error: error.message,
      });
    }
  }
};

module.exports = { sendWithConcurrency, sendSingleMessage, processCampaignWithQueue };
