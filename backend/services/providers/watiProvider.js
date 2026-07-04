const WatiService = require('../watiService');

module.exports = {
  sendMessage: WatiService.sendMessage,
  sendTemplateMessage: WatiService.sendTemplateMessage,
  replaceVariables: WatiService.replaceVariables,
  verifyWebhookSignature: WatiService.verifyWebhookSignature,
};
