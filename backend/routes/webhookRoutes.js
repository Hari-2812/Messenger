/**
 * Webhook Routes
 * Endpoints for Meta WhatsApp Cloud API webhooks
 */

const express = require('express');
const {
  verifyWebhook,
  handleWebhook,
  verifyWatiWebhook,
  handleWatiWebhook,
} = require('../controllers/webhookController');

const router = express.Router();

/**
 * GET /api/webhooks/meta and GET /api/webhooks
 * Webhook verification endpoint
 */
router.get('/meta', verifyWebhook);
router.get('/wati', verifyWatiWebhook);
router.get('/', verifyWebhook);

/**
 * POST /api/webhooks/meta and POST /api/webhooks
 * Webhook event handler
 */
router.post('/meta', handleWebhook);
router.post('/wati', handleWatiWebhook);
router.post('/', handleWebhook);

module.exports = router;
