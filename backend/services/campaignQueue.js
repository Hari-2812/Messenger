/**
 * Campaign Queue Service
 * Handles bulk message sending with queue management and concurrency control
 */

const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const MessageLog = require('../models/MessageLog');
const ProviderFactory = require('./ProviderFactory');

/**
 * Queue message sending with concurrency control
 * @param {Array} items - Array of { phone, message, contactId, campaignId }
 * @param {number} concurrency - Number of concurrent requests
 * @returns {Promise<Object>} - Results of sending
 */
const sendWithConcurrency = async (items, concurrency = 5) => {
  const results = {
    sent: 0,
    failed: 0,
    errors: [],
  };

  // Split items into batches based on concurrency
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchPromises = batch.map((item) => sendSingleMessage(item));
    const batchResults = await Promise.allSettled(batchPromises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(result.value.error);
        }
      } else {
        results.failed++;
        results.errors.push(result.reason.message);
      }
    }
  }

  return results;
};

/**
 * Send single message and create log entry
 * @param {Object} item - { phone, message, contactId, campaignId, templateName, parameters }
 * @returns {Promise<Object>} - { success, error }
 */
const sendSingleMessage = async (item) => {
  const { phone, message, contactId, campaignId, templateName, parameters } = item;

  try {
    let result;

    // If a Meta template name is provided, use template messaging
    if (templateName) {
      result = await ProviderFactory.sendTemplateMessage(phone, templateName, parameters || []);
    } else {
      result = await ProviderFactory.sendMessage(phone, message);
    }

    const logData = {
      campaignId,
      contactId,
      phone,
      message: message || `[Template: ${templateName}]`,
      provider: result.provider || 'meta',
      status: result.success ? 'sent' : 'failed',
      sentAt: result.sentAt || new Date(),
      failureReason: result.error || null,
    };

    if (result.metaMessageId) {
      logData.metaMessageId = result.metaMessageId;
    }

    await MessageLog.create(logData);

    return {
      success: result.success,
      error: result.error || null,
      messageId: result.metaMessageId,
    };
  } catch (error) {
    console.error(`Error sending message to ${phone}:`, error.message);

    await MessageLog.create({
      campaignId,
      contactId,
      phone,
      message: message || `[Template: ${templateName}]`,
      provider: 'meta',
      status: 'failed',
      failureReason: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Process campaign with concurrency control
 * @param {Object} campaign - Campaign document
 * @param {Object} template - Template document
 * @param {Array} contacts - Array of contact documents
 * @returns {Promise<void>}
 */
const processCampaignWithQueue = async (campaign, template, contacts) => {
  const concurrency = parseInt(process.env.CAMPAIGN_CONCURRENCY || '5', 10);
  const isMeta = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase() === 'meta';

  // Prepare items for sending
  const items = contacts.map((contact) => {
    const item = {
      phone: contact.phone,
      message: ProviderFactory.replaceVariables(template.message, contact),
      contactId: contact._id,
      campaignId: campaign._id,
    };

    // For Meta provider, use template messaging (required for business-initiated conversations)
    if (isMeta) {
      // Use 'hello_world' as default template (available in all Meta test accounts)
      // hello_world has no body parameters, so pass empty array
      item.templateName = 'hello_world';
      item.parameters = [];
    }

    return item;
  });

  // Send with concurrency control
  const results = await sendWithConcurrency(items, concurrency);

  // Update campaign with results
  campaign.sentCount = results.sent;
  campaign.failedCount = results.failed;
  campaign.status = results.failed === contacts.length ? 'failed' : 'completed';
  await campaign.save();

  return results;
};

module.exports = {
  sendWithConcurrency,
  sendSingleMessage,
  processCampaignWithQueue,
};
