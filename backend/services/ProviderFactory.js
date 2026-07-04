const MetaProvider = require('./providers/metaProvider');
const WatiProvider = require('./providers/watiProvider');

const getProvider = () => (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase();

const sendMessage = async (phone, message) => {
  if (getProvider() === 'wati') {
    return WatiProvider.sendMessage(phone, message);
  }
  return MetaProvider.sendMessage(phone, message);
};

const sendTemplateMessage = async (
  phone,
  templateName,
  parameters = [],
  languageCode = 'en_US',
  options = {}
) => {
  if (getProvider() === 'wati') {
    return WatiProvider.sendTemplateMessage(phone, templateName, parameters, languageCode, options);
  }
  return MetaProvider.sendTemplateMessage(phone, templateName, parameters, languageCode);
};

const replaceVariables = (template, contact, fields = []) => {
  if (getProvider() === 'wati') return WatiProvider.replaceVariables(template, contact, fields);
  return MetaProvider.replaceVariables(template, contact);
};

module.exports = {
  getProvider,
  sendMessage,
  sendTemplateMessage,
  replaceVariables,
};
