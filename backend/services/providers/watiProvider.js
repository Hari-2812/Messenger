const WatiService = require('../watiService');

const getTemplates = async (options = {}) => {
  const { templates, total } = await WatiService.getApprovedTemplates(options);
  return { templates, total };
};

module.exports = {
  getTemplates,
  sendMessage: WatiService.sendMessage,
  sendTemplateMessage: WatiService.sendTemplateMessage,
  replaceVariables: WatiService.replaceVariables,
  verifyWebhookSignature: WatiService.verifyWebhookSignature,
};
