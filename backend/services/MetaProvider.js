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
const RETRY_DELAY_MS = [1000, 2000, 4000]; // exponential backoff
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Sleep helper for retry delays
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with timeout and retry logic
 */
const fetchWithRetry = async (url, options, label = 'MetaProvider') => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      // Retry on transient errors
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
 * @param {string} payload - Raw request body string
 * @param {string} signature - X-Hub-Signature-256 header value
 * @param {string} appSecret - WhatsApp App Secret
 * @returns {boolean}
 */
const verifyWebhookSignature = (payload, signature, appSecret) => {
  if (!appSecret || !signature) return false;

  const hash = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  const expectedSignature = `sha256=${hash}`;

  // Timing-safe comparison — prevents timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    // Lengths differ — definitely invalid
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
 * @param {Array} parameters - Body variable values
 * @param {string} languageCode - Template language code (e.g. 'en_US')
 */
const sendTemplateMessage = async (
  phoneNumber,
  templateName,
  parameters = [],
  languageCode = 'en_US'
) => {
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
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  if (parameters && parameters.length > 0) {
    payload.template.components = [
      {
        type: 'body',
        parameters: parameters.map((param) => ({ type: 'text', text: String(param) })),
      },
    ];
  }

  console.log(
    `[MetaProvider] sendTemplateMessage → ${formattedPhone} | template: "${templateName}" (${languageCode})`
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
 * Replace template variables with contact data (local preview only)
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
