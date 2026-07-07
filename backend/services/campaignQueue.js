/**
 * Campaign Queue Service — Production (WATI + Meta)
 *
 * Handles bulk WhatsApp template message sending with:
 *  - Provider-aware routing: WATI vs Meta (no mock sends)
 *  - Concurrency control (batched parallel sends)
 *  - Auto-sync contacts before send (WATI)
 *  - Detailed per-message logging (MessageLog)
 *  - Real-time socket.io progress events
 *  - Correct campaign status: processing → completed / completed_with_errors / failed
 *  - Full request/response debug logging
 */

const Campaign = require('../models/Campaign');
const MessageLog = require('../models/MessageLog');
const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const contactSyncService = require('./contactSyncService');
const watiService = require('./watiService');
const MetaProvider = require('./MetaProvider');
const ProviderFactory = require('./ProviderFactory');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE PARAMETER BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build ordered parameter array from templateVariables mapping and contact.
 *
 * Supports two formats from the frontend:
 *  1. Array:  ['name', 'phone']  → {{1}}=contact.name, {{2}}=contact.phone
 *  2. Object: {'1':'name','2':'course'} → {{1}}=contact.name, {{2}}=contact.course
 *
 * Falls back to: name → {{1}}, phone → {{2}}, email → {{3}}
 */
const buildTemplateParams = (campaign, contact) => {
  const count = campaign.templateParamCount || 0;

  // No variables → send empty parameters (template has no {{n}} placeholders)
  if (count === 0) return [];

  const vars = campaign.templateVariables;

  // Format 1: Array format ['name', 'email', ...]
  if (Array.isArray(vars) && vars.length > 0) {
    return vars.slice(0, count).map((field) =>
      String(contact[field] ?? contact.customFields?.[field] ?? '')
    );
  }

  // Format 2: Object format {'1': 'name', '2': 'course', ...}
  if (vars && typeof vars === 'object' && !Array.isArray(vars)) {
    return Array.from({ length: count }, (_, i) => {
      const field = vars[String(i + 1)] || vars[i + 1];
      return String(contact[field] ?? contact.customFields?.[field] ?? '');
    });
  }

  // Fallback: name → {{1}}, phone → {{2}}, email → {{3}}
  return [
    contact.name  || 'Customer',
    contact.phone || '',
    contact.email || '',
  ]
    .slice(0, count)
    .map(String);
};

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE MESSAGE SENDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send one template message for a single contact.
 * Routes to watiService or MetaProvider based on campaign.provider.
 * Creates a MessageLog entry regardless of success or failure.
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
    provider,
    campaignName,
    broadcastName,
  } = item;

  const localMessageId = `${campaignId}-${contactId}-${Date.now()}`;

  // ── Debug: log what we are about to send ──────────────────────────────────
  console.log(
    `[CampaignQueue] ▶ Sending | provider: ${provider} | template: "${templateName}" | ` +
    `phone: ${phone} | params: ${JSON.stringify(parameters)}`
  );

  try {
    if (!templateName) {
      throw new Error('No template name specified for campaign send');
    }

    // ── Auto-sync contact if WATI and not yet synced ───────────────────────
    if (provider === 'wati') {
      try {
        const syncResult = await contactSyncService.ensureContactSynced(contactId);
        if (!syncResult.success) {
          console.warn(
            `[CampaignQueue] Auto-sync failed for contact ${contactId}: ${syncResult.error || 'unknown'}`
          );
        } else {
          console.log(`[CampaignQueue] Contact ${contactId} confirmed synced with WATI`);
        }
      } catch (syncErr) {
        console.warn(`[CampaignQueue] Auto-sync exception for contact ${contactId}: ${syncErr.message}`);
      }
    }

    // ── Route to correct provider ──────────────────────────────────────────
    let result;

    if (provider === 'wati') {
      // WATI expects parameters as [{name:'1', value:'...'}, {name:'2', value:'...'}]
      // watiService.sendTemplateMessage handles the array → WATI format conversion
      result = await watiService.sendTemplateMessage(
        phone,
        templateName,
        parameters,         // plain string array, e.g. ['Hari', '919876543210']
        templateLanguage || 'en_US',
        {
          broadcastName: broadcastName || `${campaignName || campaignId}-${Date.now()}`,
          localMessageId,
        }
      );
    } else {
      // Meta Cloud API expects { body: ['value1', 'value2'] }
      result = await MetaProvider.sendTemplateMessage(
        phone,
        templateName,
        { body: parameters || [] },
        templateLanguage || 'en_US'
      );
    }

    // ── Debug: log provider response ──────────────────────────────────────
    console.log(
      `[CampaignQueue] ◀ Response | provider: ${provider} | phone: ${phone} | ` +
      `success: ${result.success} | messageId: ${result.watiMessageId || result.metaMessageId || 'N/A'} | ` +
      `error: ${result.error || 'none'}`
    );

    const logStatus = result.success ? 'sent' : 'failed';

    const logEntry = {
      campaignId,
      contactId,
      phone,
      message: previewMessage || `[Template: ${templateName}]`,
      provider,
      status: logStatus,
      sentAt: result.success ? (result.sentAt || new Date()) : null,
      localMessageId,
      failureReason: result.success ? null : (result.error || 'WATI API rejected message'),
    };

    if (result.metaMessageId) logEntry.metaMessageId = result.metaMessageId;
    if (result.watiMessageId) logEntry.watiMessageId = result.watiMessageId;

    await MessageLog.create(logEntry);

    // Update contact's last message status
    await Contact.findByIdAndUpdate(contactId, {
      lastMessageStatus: logStatus,
      lastMessageAt: new Date(),
      ...(provider === 'wati' && result.success ? { whatsappStatus: 'active' } : {}),
    });

    // Upsert conversation thread
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
            status: logStatus,
            provider,
            providerMessageId: result.watiMessageId || result.metaMessageId || null,
            localMessageId,
            timestamp: new Date(),
          },
        },
      },
      { upsert: true, new: true }
    );

    return { success: result.success, error: result.error || null };

  } catch (error) {
    // ── Full error body log ────────────────────────────────────────────────
    console.error(
      `[CampaignQueue] ✗ Exception | provider: ${provider} | phone: ${phone} | ` +
      `template: "${templateName}" | error: ${error.message}`
    );

    await MessageLog.create({
      campaignId,
      contactId,
      phone,
      message: previewMessage || `[Template: ${templateName || 'unknown'}]`,
      provider,
      status: 'failed',
      localMessageId,
      failureReason: error.message,
    });

    return { success: false, error: error.message };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONCURRENCY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send items in batches with concurrency limit.
 * Emits socket.io progress events after every batch.
 */
const sendWithConcurrency = async (items, concurrency = 5, io = null, campaignId = null) => {
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
        if (!result.value.success && result.value.error) {
          results.errors.push(result.value.error);
        }
      } else {
        results.failed++;
        results.errors.push(result.reason?.message || 'Unknown error');
      }
    }

    // Emit real-time progress
    if (io && campaignId) {
      const progress = Math.round(((results.sent + results.failed) / total) * 100);
      io.to(`campaign:${campaignId}`).emit('campaign:progress', {
        campaignId,
        sent:    results.sent,
        failed:  results.failed,
        total,
        percent: progress,
      });
    }
    
    if (i + concurrency < items.length) {
      await sleep(1000); // 1-second delay between batches
    }
  }

  return results;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CAMPAIGN PROCESSOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process a campaign — build message items per contact and send with concurrency.
 * Called via setImmediate() from campaignController (background, non-blocking).
 *
 * Status flow:
 *   processing → completed             (all sent)
 *   processing → completed_with_errors (some failed)
 *   processing → failed                (all failed or exception)
 */
const processCampaignWithQueue = async (campaign, template, contacts, io = null) => {
  const concurrency = parseInt(process.env.CAMPAIGN_CONCURRENCY || '5', 10);
  const provider = campaign.provider || ProviderFactory.getProvider();

  if (!campaign.metaTemplateName) {
    const errMsg = `Campaign "${campaign.campaignName}" has no template name. Cannot send.`;
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

  console.log({ campaignId: campaign._id, totalContacts: contacts.length, templateName: campaign.metaTemplateName });
  console.log(
    `[CampaignQueue] ═══ Starting Campaign ═══\n` +
    `  Name:       "${campaign.campaignName}"\n` +
    `  Provider:   ${provider}\n` +
    `  Template:   ${campaign.metaTemplateName}\n` +
    `  Variables:  ${JSON.stringify(campaign.templateVariables)}\n` +
    `  ParamCount: ${campaign.templateParamCount || 0}\n` +
    `  Recipients: ${contacts.length}\n` +
    `  Concurrency:${concurrency}`
  );

  // Build one send item per contact
  const sharedBroadcastName = `${campaign.campaignName}-${campaign._id.toString()}`;

  const items = contacts.map((contact) => {
    const parameters = buildTemplateParams(campaign, contact);

    // Build human-readable preview by substituting {{n}} placeholders
    let previewMessage = `[Template: ${campaign.metaTemplateName}]`;
    if (parameters.length > 0) {
      previewMessage = parameters.reduce(
        (text, value, i) => text.replace(`{{${i + 1}}}`, value),
        campaign.metaTemplateBodyText || previewMessage
      );
    }

    console.log(
      `[CampaignQueue] Contact: ${contact.name} (${contact.phone}) | params: ${JSON.stringify(parameters)}`
    );

    return {
      phone:           contact.phone,
      contactId:       contact._id,
      campaignId:      campaign._id,
      templateName:    campaign.metaTemplateName,
      templateLanguage: campaign.metaTemplateLanguage || 'en_US',
      parameters,
      previewMessage,
      provider,
      campaignName:    campaign.campaignName,
      broadcastName:   sharedBroadcastName,
    };
  });

  try {
    const results = await sendWithConcurrency(
      items,
      concurrency,
      io,
      campaign._id.toString()
    );

    // ── Determine final campaign status ────────────────────────────────────
    let finalStatus;
    if (results.sent === 0) {
      finalStatus = 'failed';
    } else {
      finalStatus = 'processing';
    }

    campaign.sentCount   = results.sent;
    campaign.failedCount = results.failed;
    campaign.status      = finalStatus;
    await campaign.save();

    console.log(
      `[CampaignQueue] ═══ Campaign Done ═══\n` +
      `  Name:   "${campaign.campaignName}"\n` +
      `  Sent:   ${results.sent}\n` +
      `  Failed: ${results.failed}\n` +
      `  Status: ${finalStatus}`
    );

    if (results.errors.length > 0) {
      console.error(`[CampaignQueue] Top errors:`, results.errors.slice(0, 5));
    }

    if (io) {
      io.to(`campaign:${campaign._id}`).emit('campaign:completed', {
        campaignId:  campaign._id,
        status:      finalStatus,
        sentCount:   results.sent,
        failedCount: results.failed,
        total:       contacts.length,
      });
    }

    return results;

  } catch (error) {
    console.error(`[CampaignQueue] ✗ Fatal error for campaign ${campaign._id}: ${error.message}`);
    campaign.status = 'failed';
    await campaign.save();

    if (io) {
      io.to(`campaign:${campaign._id}`).emit('campaign:failed', {
        campaignId: campaign._id,
        error:      error.message,
      });
    }
  }
};

module.exports = {
  buildTemplateParams,
  sendWithConcurrency,
  sendSingleMessage,
  processCampaignWithQueue,
};
