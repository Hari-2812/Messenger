/**
 * Webhook Routes
 * Endpoints for Meta WhatsApp Cloud API webhooks
 */

const express = require('express');
const { verifyWebhook, handleWebhook } = require('../controllers/webhookController');

const router = express.Router();

/**
 * GET /api/webhooks/meta
 * Webhook verification endpoint
 * Meta sends a GET request here to verify the webhook endpoint
 */
router.get('/meta', verifyWebhook);

/**
 * POST /api/webhooks/meta
 * Webhook event handler
 * Meta sends status updates and incoming messages here
 */
router.post('/meta', handleWebhook);

module.exports = router;
