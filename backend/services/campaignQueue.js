/**
 * Campaign Queue Service — Production
 * Handles bulk Meta WhatsApp template message sending with
 * concurrency control and detailed per-message logging.
 *
 * All messages are sent via the real Meta WhatsApp Cloud API.
 * No mock provider. No fake message IDs. No simulated delays.
 */

const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const MessageLog = require('../models/MessageLog');
const ProviderFactory = require('./ProviderFactory');

/**
 * Send messages with concurrency control
 * @param {Array} items - Array of message items
 * @param {number} concurrency - Max parallel sends
 * @returns {Promise<Object>} - { sent, failed, errors }
 */
const sendWithConcurrency = async (items, concurrency = 5) => {
  const results = { sent: 0, failed: 0, errors: [] };

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
  }

  return results;
};

/**
 * Send a single template message and write a MessageLog entry.
 * @param {Object} item - {
 *   phone, contactId, campaignId,
 *   templateName, templateLanguage, parameters,
 *   previewMessage   // for log display only
 * }
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
    // ── Validate required fields ──────────────────────────────────────────
    if (!templateName) {
      throw new Error('No Meta template name specified for this campaign send');
    }

    // ── Send via Meta Cloud API ───────────────────────────────────────────
    console.log(`[Campaign] Sending template "${templateName}" (${templateLanguage}) → ${phone}`);

    const result = await ProviderFactory.sendTemplateMessage(
      phone,
      templateName,
      parameters || [],
      templateLanguage || 'en_US'
    );

    // ── PER-RECIPIENT RESULT LOG ───────────────────────────────────────────────
    if (result.success) {
      console.log('[CampaignQueue] ── SEND RESULT: SUCCESS ──');
      console.log('[CampaignQueue] Recipient  :', phone);
      console.log('[CampaignQueue] Status     : sent');
      console.log('[CampaignQueue] Meta ID    :', result.metaMessageId);
    } else {
      console.error('[CampaignQueue] ── SEND RESULT: FAILED ──');
      console.error('[CampaignQueue] Recipient  :', phone);
      console.error('[CampaignQueue] Status     : failed');
      console.error('[CampaignQueue] Error      :', result.error);
    }

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
    console.error(`[Campaign] Exception sending to ${phone}:`, error.message);

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
 * Process a campaign: prepare all message items and send with concurrency control.
 * Reads metaTemplateName and metaTemplateLanguage from the campaign document.
 * @param {Object} campaign - Campaign Mongoose document
 * @param {Object|null} template - Local Template document (optional, for text preview only)
 * @param {Array} contacts - Array of Contact documents
 */
const processCampaignWithQueue = async (campaign, template, contacts) => {
  const concurrency = parseInt(process.env.CAMPAIGN_CONCURRENCY || '5', 10);

  // ── Validate Meta template is set ────────────────────────────────────────
  if (!campaign.metaTemplateName) {
    const errMsg = `Campaign "${campaign.campaignName}" has no Meta template selected. Cannot send.`;
    console.error(`[Campaign] ✗ ${errMsg}`);
    campaign.status = 'failed';
    await campaign.save();
    throw new Error(errMsg);
  }

  // ── CAMPAIGN TRIGGER LOG ───────────────────────────────────────────────────
  console.log('[CampaignQueue] ── CAMPAIGN TRIGGERED ──');
  console.log('[CampaignQueue] Campaign ID   :', campaign._id.toString());
  console.log('[CampaignQueue] Campaign Name :', campaign.campaignName);
  console.log('[CampaignQueue] Template Name :', campaign.metaTemplateName);
  console.log('[CampaignQueue] Language Code :', campaign.metaTemplateLanguage || 'en_US');
  console.log('[CampaignQueue] Recipients    :', contacts.length);
  console.log('[CampaignQueue] Concurrency   :', concurrency);
  console.log('[CampaignQueue] Phone Numbers :', contacts.map(c => c.phone).join(', '));

  // ── Build send items ──────────────────────────────────────────────────────
  const items = contacts.map((contact) => ({
    phone: contact.phone,
    contactId: contact._id,
    campaignId: campaign._id,
    templateName: campaign.metaTemplateName,
    templateLanguage: campaign.metaTemplateLanguage || 'en_US',
    parameters: [],
    // Local template message used for log preview only (not sent to Meta)
    previewMessage: template
      ? `[Template: ${campaign.metaTemplateName}] → ${contact.name}`
      : `[Template: ${campaign.metaTemplateName}]`,
  }));

  // ── Send ──────────────────────────────────────────────────────────────────
  const results = await sendWithConcurrency(items, concurrency);

  // ── Update campaign stats ─────────────────────────────────────────────────
  campaign.sentCount = results.sent;
  campaign.failedCount = results.failed;
  campaign.status = results.failed === contacts.length ? 'failed' : 'completed';
  await campaign.save();

  console.log(
    `[Campaign] Done: "${campaign.campaignName}" | ` +
    `Sent: ${results.sent} | Failed: ${results.failed} | Status: ${campaign.status}`
  );

  if (results.errors.length > 0) {
    console.error(`[Campaign] Errors:`, results.errors.slice(0, 5));
  }

  return results;
};

module.exports = {
  sendWithConcurrency,
  sendSingleMessage,
  processCampaignWithQueue,
};
