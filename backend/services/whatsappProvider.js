/**
 * Mock WhatsApp Provider
 * Replace this module with Meta WhatsApp Business API integration later.
 */

const sendMessage = async (phone, message) => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Mock: always succeed (can add random failures for testing)
  console.log(`[MockWhatsApp] Sent to ${phone}: ${message.substring(0, 50)}...`);

  return {
    success: true,
    messageId: `mock_${Date.now()}_${phone}`,
    provider: 'mock',
  };
};

const replaceVariables = (template, contact) => {
  return template
    .replace(/\{\{name\}\}/gi, contact.name || '')
    .replace(/\{\{phone\}\}/gi, contact.phone || '')
    .replace(/\{\{email\}\}/gi, contact.email || '');
};

module.exports = { sendMessage, replaceVariables };
