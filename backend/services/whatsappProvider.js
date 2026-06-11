/**
 * WhatsApp Provider — Production
 * This module is a thin wrapper that delegates directly to MetaProvider.
 * The mock implementation has been removed. All messages go through
 * the real Meta WhatsApp Cloud API.
 */

const MetaProvider = require('./MetaProvider');

// Re-export MetaProvider functions directly — no mock, no fake delays
module.exports = {
  sendMessage: MetaProvider.sendMessage,
  sendTemplateMessage: MetaProvider.sendTemplateMessage,
  replaceVariables: MetaProvider.replaceVariables,
  verifyWebhookSignature: MetaProvider.verifyWebhookSignature,
};
