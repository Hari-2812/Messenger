/**
 * Environment Variable Validation — Production
 * Meta WhatsApp Cloud API is the only provider.
 * All required credentials are validated at startup with entropy checks.
 */

const REQUIRED_ENV = [
  'MONGODB_URI',
  'JWT_SECRET',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'WHATSAPP_APP_SECRET',           // Required: webhook signature verification
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN', // Required: webhook challenge verification
];

const validateEnv = () => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`[Env] ✗ Missing required environment variables: ${missing.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // JWT entropy check — must be at least 32 characters
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error(
      '[Env] JWT_SECRET must be at least 32 characters for production security. ' +
      `Current length: ${process.env.JWT_SECRET.length}`
    );
  }

  // Warn on optional but important settings
  if (!process.env.PORT) {
    console.warn('[Env] PORT is not set — defaulting to 5000');
  }

  if (!process.env.JWT_EXPIRES_IN) {
    console.warn('[Env] JWT_EXPIRES_IN not set — defaulting to 7d');
  }

  if (!process.env.ALLOWED_ORIGINS) {
    console.warn('[Env] ALLOWED_ORIGINS not set — CORS will only allow localhost:5173');
  }

  if (!process.env.NODE_ENV) {
    console.warn('[Env] NODE_ENV not set — defaulting to development behaviour');
  }

  if (!process.env.DELIVERY_TIMEOUT_MINUTES) {
    console.warn('[Env] DELIVERY_TIMEOUT_MINUTES not set — defaulting to 30 minutes');
  }

  console.log('[Env] ✓ All required environment variables present');
  console.log(`[Env] Provider       : Meta WhatsApp Cloud API`);
  console.log(`[Env] Phone Number ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
  console.log(`[Env] NODE_ENV       : ${process.env.NODE_ENV || 'development'}`);
};

module.exports = { validateEnv };
