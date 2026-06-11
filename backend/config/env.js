/**
 * Environment Variable Validation — Production
 * Meta WhatsApp Cloud API is the only provider.
 * All Meta credentials are required at startup.
 */

const REQUIRED_ENV = [
  'MONGODB_URI',
  'JWT_SECRET',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
];

const validateEnv = () => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (!process.env.PORT) {
    console.warn('[Env] PORT is not set — defaulting to 5000');
  }

  if (missing.length > 0) {
    console.error(`[Env] Missing required environment variables: ${missing.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (!process.env.JWT_EXPIRES_IN) {
    console.warn('[Env] JWT_EXPIRES_IN not set — defaulting to 7d');
  }

  if (!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.warn('[Env] WHATSAPP_WEBHOOK_VERIFY_TOKEN not set — webhook verification will fail');
  }

  if (!process.env.WHATSAPP_APP_SECRET) {
    console.warn('[Env] WHATSAPP_APP_SECRET not set — webhook signature verification is DISABLED');
  }

  console.log('[Env] ✓ All required environment variables present');
  console.log(`[Env] Provider: Meta WhatsApp Cloud API`);
  console.log(`[Env] Phone Number ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
};

module.exports = { validateEnv };
