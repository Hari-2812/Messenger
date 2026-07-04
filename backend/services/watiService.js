const crypto = require('crypto');
const { getWatiConfig } = require('../config/wati');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [1000, 2000, 4000];
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');

const getTemplateBody = (template) => {
  const components = template.components || template.template?.components || [];
  const body = components.find((c) => String(c.type || '').toUpperCase() === 'BODY');
  return body?.text || template.body || template.bodyText || template.templateBody || '';
};

const countVariables = (text) => {
  const matches = [...String(text || '').matchAll(/\{\{(\d+)\}\}/g)];
  if (!matches.length) return 0;
  return Math.max(...matches.map((m) => parseInt(m[1], 10)));
};

const mapTemplate = (template) => {
  const bodyText = getTemplateBody(template);
  return {
    id: template.id || template._id || template.template_id || template.templateId || template.name,
    name: template.name || template.template_name || template.elementName || template.templateName,
    status: String(template.status || template.template_status || 'UNKNOWN').toUpperCase(),
    language: template.language || template.languageCode || template.locale || 'en_US',
    category: template.category || template.template_category || 'UTILITY',
    bodyText,
    paramCount: countVariables(bodyText),
    raw: template,
  };
};

const buildUrl = (path, query = {}) => {
  const { baseUrl } = getWatiConfig();
  if (!baseUrl) throw new Error('WATI_API_ENDPOINT is not configured');

  const url = new URL(`${baseUrl}/api/ext/v3/${path.replace(/^\/+/, '')}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const request = async (path, options = {}, label = 'WATI') => {
  const { accessToken } = getWatiConfig();
  if (!accessToken) throw new Error('WATI_ACCESS_TOKEN is not configured');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(buildUrl(path, options.query), {
        method: options.method || 'GET',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      clearTimeout(timeout);

      if (!response.ok && RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS[attempt]);
        continue;
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) {
        const message = data.message || data.error || data.title || `HTTP ${response.status}`;
        throw new Error(`WATI API Error: ${message}`);
      }
      return data;
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') throw new Error(`${label} request timed out after 30s`);
      if (attempt < MAX_RETRIES && !String(error.message).startsWith('WATI API Error')) {
        await sleep(RETRY_DELAY_MS[attempt]);
        continue;
      }
      throw error;
    }
  }
};

const extractItems = (data) => {
  if (Array.isArray(data)) return data;
  return data.items || data.templates || data.messageTemplates || data.data || data.result || [];
};

const getApprovedTemplates = async ({ includeAll = false } = {}) => {
  const templates = [];
  let page = 1;

  while (page <= 20) {
    const data = await request('messageTemplates', {
      query: { page_number: page, page_size: 100, channel: getWatiConfig().channel },
    }, 'WATI.getTemplates');
    const items = extractItems(data);
    templates.push(...items.map(mapTemplate));
    if (items.length < 100) break;
    page += 1;
  }

  const filtered = includeAll
    ? templates
    : templates.filter((t) => t.status === 'APPROVED');
  return { templates: filtered, total: filtered.length };
};

const syncContact = async (contact) => {
  const payload = {
    contacts: [
      {
        target: normalizePhone(contact.phone),
        phone_number: normalizePhone(contact.phone),
        name: contact.name,
        email: contact.email || '',
        tags: contact.tags || [],
        custom_params: [
          { name: 'source', value: contact.source || 'CRM' },
          { name: 'crm_contact_id', value: String(contact._id || '') },
        ],
      },
    ],
  };

  const data = await request('contacts', {
    method: 'PUT',
    body: payload,
  }, 'WATI.syncContact');

  const updated = extractItems(data)[0] || data.contact || data.contacts?.[0] || data;
  return {
    success: true,
    watiContactId: updated.id || updated._id || updated.contactId || updated.contact_id || null,
    raw: data,
  };
};

const sendTemplateMessage = async (
  phone,
  templateName,
  components = {},
  languageCode = 'en_US',
  options = {}
) => {
  const parameters = Array.isArray(components) ? components : (components.body || []);
  const customParams = parameters.map((value, index) => ({
    name: String(index + 1),
    value: String(value ?? ''),
  }));

  const localMessageId = options.localMessageId || crypto.randomUUID();
  const recipient = {
    phone_number: normalizePhone(phone),
    target: normalizePhone(phone),
    custom_params: customParams,
    local_message_id: localMessageId,
  };

  const data = await request('messageTemplates/send', {
    method: 'POST',
    body: {
      channel: getWatiConfig().channel,
      template_name: templateName,
      broadcast_name: options.broadcastName || `CRM-${templateName}-${Date.now()}`,
      recipients: [recipient],
    },
  }, 'WATI.sendTemplateMessage');

  const messageId =
    data.messageId ||
    data.id ||
    data.localMessageId ||
    data.result?.messageId ||
    data.result?.[0]?.messageId ||
    localMessageId;

  return {
    success: true,
    metaMessageId: messageId,
    watiMessageId: messageId,
    localMessageId,
    provider: 'wati',
    status: 'accepted',
    sentAt: new Date(),
    raw: data,
  };
};

const sendMessage = async (phone, text) => {
  const data = await request('conversations/messages/text', {
    method: 'POST',
    body: {
      target: normalizePhone(phone),
      text,
    },
  }, 'WATI.sendMessage');

  const messageId = data.messageId || data.id || data.result?.messageId || data.result?.id;
  return {
    success: true,
    metaMessageId: messageId,
    watiMessageId: messageId,
    provider: 'wati',
    status: 'sent',
    sentAt: new Date(),
    raw: data,
  };
};

const verifyWebhookSignature = (rawBody, signature, secret) => {
  if (!secret) return true;
  if (!signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody || '').digest('hex');
  const normalized = String(signature).replace(/^sha256=/, '');

  try {
    return crypto.timingSafeEqual(Buffer.from(normalized), Buffer.from(expected));
  } catch {
    return false;
  }
};

const replaceVariables = (templateText, contact, fields = []) => {
  return String(templateText || '').replace(/\{\{(\d+)\}\}/g, (_, index) => {
    const field = fields[parseInt(index, 10) - 1];
    if (field) return contact[field] || contact.customFields?.[field] || '';
    const fallback = ['name', 'phone', 'email'][parseInt(index, 10) - 1];
    return contact[fallback] || '';
  });
};

module.exports = {
  getApprovedTemplates,
  syncContact,
  sendTemplateMessage,
  sendMessage,
  verifyWebhookSignature,
  replaceVariables,
  normalizePhone,
};
