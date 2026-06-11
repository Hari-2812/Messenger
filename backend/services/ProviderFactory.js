/**
 * Provider Factory — Production Only
 * All WhatsApp messages are sent via the Meta WhatsApp Cloud API.
 * The mock provider has been permanently removed.
 * No environment variable switching — Meta is the only provider.
 */

const MetaProvider = require('./MetaProvider');

/**
 * Send a plain text message via Meta WhatsApp Cloud API
 * NOTE: Meta only allows template messages for business-initiated conversations.
 * Use sendTemplateMessage for all outbound campaign messages.
 * @param {string} phone - Recipient phone number (with country code)
 * @param {string} message - Message text
 * @returns {Promise<Object>} - { success, metaMessageId, provider, status, sentAt, error }
 */
const sendMessage = async (phone, message) => {
  console.log(`[Meta] sendMessage → ${phone}`);
  return MetaProvider.sendMessage(phone, message);
};

/**
 * Send a WhatsApp template message via Meta Cloud API
 * @param {string} phone - Recipient phone number
 * @param {string} templateName - Approved Meta template name
 * @param {Array} parameters - Body variable values
 * @param {string} languageCode - Template language code (e.g. 'en_US')
 * @returns {Promise<Object>} - { success, metaMessageId, provider, status, sentAt, error }
 */
const sendTemplateMessage = async (phone, templateName, parameters = [], languageCode = 'en_US') => {
  console.log(`[Meta] sendTemplateMessage → ${phone} | template: ${templateName} | lang: ${languageCode}`);
  return MetaProvider.sendTemplateMessage(phone, templateName, parameters, languageCode);
};

/**
 * Replace {{name}}, {{phone}}, {{email}} variables in a local template string
 * (Used for preview only — actual sends use Meta template parameters)
 */
const replaceVariables = (template, contact) => {
  return MetaProvider.replaceVariables(template, contact);
};

module.exports = {
  sendMessage,
  sendTemplateMessage,
  replaceVariables,
};
