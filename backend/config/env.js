const REQUIRED_BASE_ENV = ['MONGODB_URI', 'JWT_SECRET'];
const REQUIRED_META_ENV = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
];

const getWhatsAppProvider = () => (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase();

const getRequiredEnvVars = () => {
  const required = [...REQUIRED_BASE_ENV];

  if (getWhatsAppProvider() === 'meta') {
    required.push(...REQUIRED_META_ENV);
  }

  return required;
};

const validateEnv = () => {
  const missing = getRequiredEnvVars().filter((key) => !process.env[key]);

  if (!process.env.PORT) {
    console.warn('PORT is not set; defaulting to 5000 for local development.');
  }

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (!process.env.JWT_EXPIRES_IN) {
    console.log('JWT_EXPIRES_IN not set; defaulting to 7d');
  }

  if (getWhatsAppProvider() === 'meta') {
    if (!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      console.warn('WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set; webhook verification will fail.');
    }

    if (!process.env.WHATSAPP_APP_SECRET) {
      console.warn('WHATSAPP_APP_SECRET is not set; webhook signature verification is disabled.');
    }
  }
};

module.exports = {
  validateEnv,
  getRequiredEnvVars,
};
