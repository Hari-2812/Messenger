const MetaProvider = require('../MetaProvider');

module.exports = {
  sendMessage: MetaProvider.sendMessage,
  sendTemplateMessage: MetaProvider.sendTemplateMessage,
  replaceVariables: MetaProvider.replaceVariables,
  verifyWebhookSignature: MetaProvider.verifyWebhookSignature,
};
