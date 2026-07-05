/**
 * Campaign Queue Service — Production
 *
 * Handles bulk Meta WhatsApp template message sending with:
 *  - Concurrency control (batched parallel sends)
 *  - Detailed per-message logging (MessageLog)
 *  - Real-time socket.io progress events
 *  - Partial campaign status support
 *  - Dynamic template variable mapping per contact
 *
 * Privacy: Phone numbers are NEVER logged individually.
 */

const Campaign = require('../models/Campaign');
const MessageLog = require('../models/MessageLog');
const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const ProviderFactory = require('./ProviderFactory');
const contactSyncService = require('./contactSyncService');

/**
 * Build ordered parameter array for Meta template body variables.
 * Maps campaign.templateVariables config → contact fields.
 *
 * e.g. templateVariables: ['name', 'phone']
 *   → contact.name  = {{1}}

/**
 * Build ordered parameter array for Meta template body variables.
 * Maps campaign.templateVariables config → contact fields.
 *
 * e.g. templateVariables: ['name', 'phone']
 *   → contact.name  = {{1}}
 *   → contact.phone = {{2}}
 *
 * @param {Object} campaign - Campaign Mongoose document
 * @param {Object} contact  - Contact Mongoose document
 * @returns {string[]}      - Ordered values for {{1}}, {{2}}, ...
 */
const buildTemplateParams = (campaign, contact) => {
  const count = campaign.templateParamCount || 0;

  // Template has no variables — send empty (no components needed)
  if (count === 0) return [];

  // Use explicit field mapping if defined
  if (campaign.templateVariables && campaign.templateVariables.length > 0) {
    return campaign.templateVariables.slice(0, count).map((field) =>
      String(contact[field] || contact.customFields?.[field] || '')
    );
  }

  // Fallback — map name → {{1}}, phone → {{2}}, email → {{3}}
  return [
    contact.name  || 'Customer',
    contact.phone || '',
    contact.email || '',
  ]
    .slice(0, count)
    .map(String);
};

/**
 * Send a single template message and write a MessageLog entry.
 */
const sendSingleMessage = async (item) => {
  const {
    phone,
    contactId,
    campaignId,
    templateName,
    templateLanguage,
    parameters,
    previewMessage,
  } = item;

  try {
    if (!templateName) {
      throw new Error('No Meta template name specified');
    }

    // Pass structured components object — MetaProvider expects { body: [] }
    const provider = ProviderFactory.getProvider();

    // Auto-sync contact if provider is WATI and not yet synced
    if (provider === 'wati') {
      try {
        const syncResult = await contactSyncService.ensureContactSynced(contactId);
        if (!syncResult.success) {
          console.warn(
            `[CampaignQueue] Auto-sync failed for contact ${contactId}: ${syncResult.error || 'unknown'}`
          );
        }
      } catch (syncErr) {
        console.warn(`[CampaignQueue] Auto-sync failed for contact ${contactId}: ${syncErr.message}`);
      }
    }

    const localMessageId = `${campaignId}-${contactId}-${Date.now()}`;
    const result = await ProviderFactory.sendTemplateMessage(
      phone,
      templateName,
      { body: parameters || [] },
      templateLanguage || 'en_US',
      { localMessageId, broadcastName: String(campaignId) }
    );

    const logEntry = {
      campaignId,
      contactId,
      phone,
      message: previewMessage || `[Template: ${templateName}]`,
      provider,
      status: result.success ? 'accepted' : 'failed',
      sentAt: result.sentAt || (result.success ? new Date() : null),
      localMessageId: result.localMessageId || localMessageId,
      failureReason: result.error || null,
    };

    if (result.metaMessageId) {
      logEntry.metaMessageId = result.metaMessageId;
    }
    if (result.watiMessageId) {
      logEntry.watiMessageId = result.watiMessageId;
    }

    await MessageLog.create(logEntry);
    await Contact.findByIdAndUpdate(contactId, {
      lastMessageStatus: logEntry.status,
      lastMessageAt: new Date(),
      ...(provider === 'wati' && result.success ? { whatsappStatus: 'active' } : {}),
    });
    await Conversation.findOneAndUpdate(
      { phone },
      {
        $set: {
          contactId,
          phone,
          lastMessage: logEntry.message,
          lastMessageAt: new Date(),
          lastMessageDirection: 'outbound',
        },
        $push: {
          messages: {
            direction: 'outbound',
            text: logEntry.message,
            status: logEntry.status,
            provider,
            providerMessageId: result.watiMessageId || result.metaMessageId || null,
            localMessageId: logEntry.localMessageId,
            timestamp: new Date(),
          },
        },
      },
      { upsert: true, new: true }
    );

    return { success: result.success, error: result.error || null };
  } catch (error) {
    console.error(
      `[CampaignQueue] Exception sending to contact ${contactId}: ${error.message}`
    );

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
 * Send messages with concurrency control.
 * Emits socket.io events for real-time progress.
 */
const sendWithConcurrency = async (
  items,
  concurrency = 5,
  io = null,
  campaignId = null
) => {
  const results = { sent: 0, failed: 0, errors: [] };
  const total = items.length;

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((item) => sendSingleMessage(item))
    );

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
      const progress = Math.round(
        ((results.sent + results.failed) / total) * 100
      );
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
 * Process a campaign — prepare all message items and send with concurrency.
 * Called in background (setImmediate) from campaignController.
 * Emits campaign:completed / campaign:failed socket events when done.
 *
 * @param {Object}      campaign - Campaign Mongoose document
 * @param {Object|null} template - Local Template document (optional, preview only)
 * @param {Array}       contacts - Array of Contact documents
 * @param {Object|null} io       - socket.io server instance
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
    `template: ${campaign.metaTemplateName} | ` +
    `variables: [${(campaign.templateVariables || []).join(', ')}] | ` +
    `paramCount: ${campaign.templateParamCount || 0} | ` +
    `recipients: ${contacts.length} | concurrency: ${concurrency}`
  );

  // Build send items per contact — resolves template variables dynamically
  const items = contacts.map((contact) => {
    const parameters = buildTemplateParams(campaign, contact);

    // Build a readable preview by replacing {{1}}, {{2}} in body text
    let previewMessage = `[Template: ${campaign.metaTemplateName}]`;
    if (parameters.length > 0) {
      previewMessage = parameters.reduce(
        (text, value, i) => text.replace(`{{${i + 1}}}`, value),
        campaign.metaTemplateBodyText || previewMessage
      );
    }

    return {
      phone: contact.phone,
      contactId: contact._id,
      campaignId: campaign._id,
      templateName: campaign.metaTemplateName,
      templateLanguage: campaign.metaTemplateLanguage || 'en_US',
      parameters,       // e.g. ['John', '+91 98765 43210']
      previewMessage,   // e.g. 'Hi John, your number is +91 98765 43210'
    };
  });

  try {
    const results = await sendWithConcurrency(
      items,
      concurrency,
      io,
      campaign._id.toString()
    );

    // Determine campaign status after initial queueing.
    // Keep as 'sending' if messages were accepted and are awaiting webhooks.
    let finalStatus = 'sending';
    if (results.sent === 0) {
      finalStatus = 'failed';
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
      console.error(
        `[CampaignQueue] Errors (first 5):`,
        results.errors.slice(0, 5)
      );
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
    console.error(
      `[CampaignQueue] Fatal error for campaign ${campaign._id}: ${error.message}`
    );
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

module.exports = {
  sendWithConcurrency,
  sendSingleMessage,
  processCampaignWithQueue,
};
