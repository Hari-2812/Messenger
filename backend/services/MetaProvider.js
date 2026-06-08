/**
 * Meta WhatsApp Cloud API Provider
 * Handles all communication with Meta's WhatsApp Business API
 */

const crypto = require('crypto');

const GRAPH_API_VERSION = 'v23.0';
const GRAPH_API_URL = 'https://graph.facebook.com';

/**
 * Verify webhook signature from Meta
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Hub-Signature-256 header value
 * @param {string} appSecret - WhatsApp App Secret
 * @returns {boolean} - True if signature is valid
 */
const verifyWebhookSignature = (payload, signature, appSecret) => {
  if (!appSecret || !signature) {
    return false;
  }

  const hash = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  const expectedSignature = `sha256=${hash}`;
  return signature === expectedSignature;
};

/**
 * Send message via Meta WhatsApp Cloud API
 * @param {string} phoneNumber - Contact phone number (with country code, e.g., +1234567890)
 * @param {string} message - Message text
 * @param {Object} options - Additional options like templateName
 * @returns {Promise<Object>} - Result with messageId
 */
const sendMessage = async (phoneNumber, message, options = {}) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error('Meta WhatsApp API credentials are not configured');
  }

  try {
    // Format phone number: remove any non-numeric characters except +
    const formattedPhone = phoneNumber.replace(/\D/g, '').replace(/^\+/, '');

    const url = `${GRAPH_API_URL}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: {
        body: message,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      throw new Error(`Meta API Error: ${errorMessage}`);
    }

    const data = await response.json();

    return {
      success: true,
      metaMessageId: data.messages[0].id,
      provider: 'meta',
      status: 'sent',
      sentAt: new Date(),
    };
  } catch (error) {
    console.error('Meta WhatsApp API Error:', error.message);
    return {
      success: false,
      provider: 'meta',
      status: 'failed',
      error: error.message,
    };
  }
};

/**
 * Send template message via Meta WhatsApp Cloud API
 * @param {string} phoneNumber - Contact phone number
 * @param {string} templateName - Template name in Meta
 * @param {Array} parameters - Template parameters for variable replacement
 * @returns {Promise<Object>} - Result with messageId
 */
const sendTemplateMessage = async (phoneNumber, templateName, parameters = []) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error('Meta WhatsApp API credentials are not configured');
  }

  try {
    const formattedPhone = phoneNumber.replace(/\D/g, '').replace(/^\+/, '');

    const url = `${GRAPH_API_URL}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US',
        },
      },
    };

    if (parameters && parameters.length > 0) {
      payload.template.components = [
        {
          type: 'body',
          parameters: parameters.map((param) => ({
            type: 'text',
            text: param,
          })),
        },
      ];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      throw new Error(`Meta API Error: ${errorMessage}`);
    }

    const data = await response.json();

    return {
      success: true,
      metaMessageId: data.messages[0].id,
      provider: 'meta',
      status: 'sent',
      sentAt: new Date(),
    };
  } catch (error) {
    console.error('Meta Template API Error:', error.message);
    return {
      success: false,
      provider: 'meta',
      status: 'failed',
      error: error.message,
    };
  }
};

/**
 * Replace template variables with contact data
 * @param {string} template - Template text with {{variable}} placeholders
 * @param {Object} contact - Contact object
 * @returns {string} - Template with replaced variables
 */
const replaceVariables = (template, contact) => {
  return template
    .replace(/\{\{name\}\}/gi, contact.name || '')
    .replace(/\{\{phone\}\}/gi, contact.phone || '')
    .replace(/\{\{email\}\}/gi, contact.email || '');
};

module.exports = {
  sendMessage,
  sendTemplateMessage,
  replaceVariables,
  verifyWebhookSignature,
};
