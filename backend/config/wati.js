const normalizeBaseUrl = (value) => String(value || '').replace(/\/+$/, '');

const WATI_API_BASE_URL = normalizeBaseUrl(process.env.WATI_API_ENDPOINT);
const WATI_API_VERSION = 'v3';

const getWatiConfig = () => ({
  baseUrl: WATI_API_BASE_URL,
  apiVersion: WATI_API_VERSION,
  accessToken: process.env.WATI_ACCESS_TOKEN,
  businessNumber: process.env.WATI_BUSINESS_NUMBER || '',
  webhookVerifyToken: process.env.WATI_WEBHOOK_VERIFY_TOKEN,
  webhookSecret: process.env.WATI_WEBHOOK_SECRET,
  channel: process.env.WATI_CHANNEL || "whatsapp",
});

module.exports = {
  WATI_API_BASE_URL,
  WATI_API_VERSION,
  getWatiConfig,
};
