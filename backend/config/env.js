const BASE_REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];

const PROVIDER_ENV = {
  meta: [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_BUSINESS_ACCOUNT_ID',
    'WHATSAPP_APP_SECRET',
    'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  ],
  wati: ['WATI_API_ENDPOINT', 'WATI_ACCESS_TOKEN', 'WATI_WEBHOOK_VERIFY_TOKEN'],
};

const validateEnv = () => {
  const provider = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase();
  if (!PROVIDER_ENV[provider]) {
    throw new Error('[Env] WHATSAPP_PROVIDER must be either "meta" or "wati"');
  }

  const required = [...BASE_REQUIRED_ENV, ...PROVIDER_ENV[provider]];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error(
      '[Env] JWT_SECRET must be at least 32 characters for production security. ' +
      `Current length: ${process.env.JWT_SECRET.length}`
    );
  }

  if (!process.env.PORT) console.warn('[Env] PORT is not set; defaulting to 5000');
  if (!process.env.JWT_EXPIRES_IN) console.warn('[Env] JWT_EXPIRES_IN not set; defaulting to 7d');
  if (!process.env.ALLOWED_ORIGINS) {
    console.warn('[Env] ALLOWED_ORIGINS not set; CORS will only allow localhost:5173');
  }
  if (!process.env.NODE_ENV) console.warn('[Env] NODE_ENV not set; defaulting to development');
  if (!process.env.DELIVERY_TIMEOUT_MINUTES) {
    console.warn('[Env] DELIVERY_TIMEOUT_MINUTES not set; defaulting to 30 minutes');
  }

  console.log('[Env] All required environment variables present');
  console.log(`[Env] Provider: ${provider === 'wati' ? 'WATI WhatsApp Business API' : 'Meta WhatsApp Cloud API'}`);
  console.log(`[Env] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
};

module.exports = { validateEnv };
