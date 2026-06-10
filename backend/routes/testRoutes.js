/**
 * Test Routes
 * Endpoints for testing Meta WhatsApp API connection
 */

const express = require('express');
const { testWhatsAppConnection, getMetaCredentialsStatus, testWebhookProcessing } = require('../controllers/testController');

const router = express.Router();

/**
 * GET /api/test-whatsapp/status
 * Check if Meta credentials are configured
 */
router.get('/status', getMetaCredentialsStatus);

/**
 * POST /api/test-whatsapp/webhook-test
 * Test webhook signature verification and processing
 */
router.post('/webhook-test', testWebhookProcessing);

/**
 * POST /api/test-whatsapp
 * Send a test message to verify Meta connection
 * Body: { phoneNumber?, templateName?, message? }
 */
router.post('/', testWhatsAppConnection);

module.exports = router;
