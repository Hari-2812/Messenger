/**
 * Meta WhatsApp Cloud API Provider
 * Handles all communication with Meta's WhatsApp Business API.
 *
 * Security fixes:
 *  - Webhook signature uses crypto.timingSafeEqual (timing-attack safe)
 *  - Access token never logged
 *  - 30s AbortController timeout on all fetch calls
 *  - Exponential backoff retry for 429 / 5xx responses
 */

const crypto = require('crypto');
const { GRAPH_API_VERSION, GRAPH_API_URL } = require('../config/meta');

// ── Retry configuration ───────────────────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [1000, 2000, 4000];
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with timeout and retry logic
 */
const fetchWithRetry = async (url, options, label = 'MetaProvider') => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok && RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS[attempt];
        console.warn(
          `[${label}] HTTP ${response.status} — retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error(`[${label}] Request timed out after 30s`);
      }
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS[attempt];
        console.warn(`[${label}] Network error — retrying in ${delay}ms: ${error.message}`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
};

/**
 * Verify webhook signature from Meta — timing-attack safe
 */
const verifyWebhookSignature = (payload, signature, appSecret) => {
  if (!appSecret || !signature) return false;

  const hash = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  const expectedSignature = `sha256=${hash}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
};

/**
 * Send a plain text message via Meta WhatsApp Cloud API
 * NOTE: Meta only allows template messages for business-initiated conversations.
 * This should only be used for testing or replies.
 */
const sendMessage = async (phoneNumber, message) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error('Meta WhatsApp API credentials are not configured');
  }

  const formattedPhone = phoneNumber.replace(/\D/g, '').replace(/^\+/, '');
  const url = `${GRAPH_API_URL}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'text',
    text: { body: message },
  };

  console.log(`[MetaProvider] sendMessage → ${formattedPhone} (text)`);

  try {
    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      },
      'MetaProvider.sendMessage'
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      console.error(`[MetaProvider] sendMessage error: ${errorMessage}`);
      throw new Error(`Meta API Error: ${errorMessage}`);
    }

    const data = await response.json();
    console.log(`[MetaProvider] sendMessage ✓ → meta_id: ${data.messages?.[0]?.id}`);

    return {
      success: true,
      metaMessageId: data.messages[0].id,
      provider: 'meta',
      status: 'sent',
      sentAt: new Date(),
    };
  } catch (error) {
    console.error(`[MetaProvider] sendMessage ✗ → ${error.message}`);
    return { success: false, provider: 'meta', status: 'failed', error: error.message };
  }
};

/**
 * Send a WhatsApp template message via Meta Cloud API
 * @param {string} phoneNumber - Recipient phone number (with or without +)
 * @param {string} templateName - Approved Meta template name
 * @param {object} components - { header: [], body: [], buttons: [] }
 * @param {string} languageCode - Template language code (e.g. 'en_US')
 */
const sendTemplateMessage = async (
  phoneNumber,
  templateName,
  components = {},
  languageCode = 'en_US'
) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error('Meta WhatsApp API credentials are not configured');
  }

  const formattedPhone = phoneNumber.replace(/\D/g, '').replace(/^\+/, '');
  const url = `${GRAPH_API_URL}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  // Build components array dynamically
  const templateComponents = [];

  // Header parameters (text, image, video, document)
  if (components.header && components.header.length > 0) {
    templateComponents.push({
      type: 'header',
      parameters: components.header.map((param) =>
        typeof param === 'string'
          ? { type: 'text', text: String(param) }
          : param // allow { type: 'image', image: { link: '...' } } etc.
      ),
    });
  }

  // Body parameters {{1}}, {{2}}, ...
  if (components.body && components.body.length > 0) {
    templateComponents.push({
      type: 'body',
      parameters: components.body.map((param) => ({
        type: 'text',
        text: String(param),
      })),
    });
  }

  // Button parameters (quick reply / URL suffix)
  if (components.buttons && components.buttons.length > 0) {
    components.buttons.forEach((btn, index) => {
      templateComponents.push({
        type: 'button',
        sub_type: btn.sub_type || 'quick_reply',
        index: String(index),
        parameters: [{ type: 'payload', payload: btn.payload }],
      });
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(templateComponents.length > 0 && { components: templateComponents }),
    },
  };

  console.log(
    `[MetaProvider] sendTemplateMessage → ${formattedPhone} | template: "${templateName}" | components:`,
    JSON.stringify(templateComponents, null, 2)
  );

  try {
    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      },
      'MetaProvider.sendTemplateMessage'
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      console.error(
        `[MetaProvider] sendTemplateMessage error: ${errorMessage} | phone: ${formattedPhone}`
      );
      throw new Error(`Meta API Error: ${errorMessage}`);
    }

    const data = await response.json();
    const metaId = data.messages?.[0]?.id;
    console.log(`[MetaProvider] sendTemplateMessage ✓ → meta_id: ${metaId}`);

    return {
      success: true,
      metaMessageId: metaId,
      provider: 'meta',
      status: 'sent',
      sentAt: new Date(),
    };
  } catch (error) {
    console.error(`[MetaProvider] sendTemplateMessage ✗ → ${error.message}`);
    return { success: false, provider: 'meta', status: 'failed', error: error.message };
  }
};

/**
 * Replace template variables with contact data
 * Supports both {{1}}, {{2}} (Meta format) and {{name}}, {{phone}} (legacy)
 */
const replaceVariables = (templateText, contact) => {
  const variableMap = [
    contact.name  || '',   // {{1}}
    contact.phone || '',   // {{2}}
    contact.email || '',   // {{3}}
  ];

  // Replace numbered Meta variables {{1}}, {{2}}, {{3}}
  let result = templateText.replace(/\{\{(\d+)\}\}/g, (_, index) => {
    return variableMap[parseInt(index) - 1] || '';
  });

  // Replace named legacy variables {{name}}, {{phone}}, {{email}}
  result = result
    .replace(/\{\{name\}\}/gi,  contact.name  || '')
    .replace(/\{\{phone\}\}/gi, contact.phone || '')
    .replace(/\{\{email\}\}/gi, contact.email || '');

  return result;
};

module.exports = {
  sendMessage,
  sendTemplateMessage,
  replaceVariables,
  verifyWebhookSignature,
};