/**
 * Provider Factory
 * Allows switching between different messaging providers (Meta, Mock, etc.)
 */

const MetaProvider = require('./MetaProvider');
const MockProvider = require('./whatsappProvider');

const PROVIDER_TYPES = {
  MOCK: 'mock',
  META: 'meta',
};

/**
 * Get provider instance based on configuration
 * @param {string} providerType - 'meta' or 'mock'
 * @returns {Object} - Provider instance with sendMessage and replaceVariables methods
 */
const getProvider = (providerType = process.env.WHATSAPP_PROVIDER || PROVIDER_TYPES.META) => {
  switch (providerType.toLowerCase()) {
    case PROVIDER_TYPES.MOCK:
      return MockProvider;
    case PROVIDER_TYPES.META:
      return MetaProvider;
    default:
      console.warn(`Unknown provider type: ${providerType}, using Meta provider`);
      return MetaProvider;
  }
};

/**
 * Send message using configured provider
 * @param {string} phone - Phone number
 * @param {string} message - Message text
 * @param {string} providerType - Provider type override
 * @returns {Promise<Object>} - Result from provider
 */
const sendMessage = async (phone, message, providerType) => {
  const provider = getProvider(providerType);
  return provider.sendMessage(phone, message);
};

/**
 * Replace variables in template
 * @param {string} template - Template text
 * @param {Object} contact - Contact object
 * @param {string} providerType - Provider type override
 * @returns {string} - Text with replaced variables
 */
const replaceVariables = (template, contact, providerType) => {
  const provider = getProvider(providerType);
  return provider.replaceVariables(template, contact);
};

module.exports = {
  getProvider,
  sendMessage,
  replaceVariables,
  PROVIDER_TYPES,
};
