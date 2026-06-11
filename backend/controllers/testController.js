/**
 * Test Controller
 * Handles Meta WhatsApp API connection testing
 */

const MetaProvider = require('../services/MetaProvider');

/**
 * Test Meta WhatsApp Connection
 * POST /api/test-whatsapp
 * 
 * Tests the connection to Meta WhatsApp Cloud API by sending a real test message
 * or template message to a test recipient.
 * 
 * Request body (optional):
 * {
 *   "phoneNumber": "+1234567890",    // Optional: override default test recipient
 *   "templateName": "hello_world",   // Optional: template name to test
 *   "message": "Hello from test"     // Optional: custom message text
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "status": "testing|success|failed",
 *   "provider": "meta",
 *   "metaMessageId": "string",
 *   "metaResponse": { ... },
 *   "credentialsConfigured": boolean,
 *   "timestamp": "ISO 8601",
 *   "error": "error message if failed",
 *   "requestPayload": { ... },     // Log of what was sent
 *   "responsePayload": { ... }     // Log of what was received
 * }
 */
const testWhatsAppConnection = async (req, res) => {
  const testResult = {
    success: false,
    status: 'testing',
    provider: 'meta',
    timestamp: new Date().toISOString(),
    requestPayload: null,
    responsePayload: null,
    credentialsConfigured: false,
    error: null,
  };

  try {
    // Verify credentials
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const testPhoneNumber = process.env.WHATSAPP_TEST_PHONE_NUMBER || req.body?.phoneNumber;

    testResult.credentialsConfigured = !!(accessToken && phoneNumberId);

    if (!accessToken) {
      testResult.error = 'WHATSAPP_ACCESS_TOKEN is not configured';
      testResult.status = 'failed';
      return res.status(400).json(testResult);
    }

    if (!phoneNumberId) {
      testResult.error = 'WHATSAPP_PHONE_NUMBER_ID is not configured';
      testResult.status = 'failed';
      return res.status(400).json(testResult);
    }

    if (!testPhoneNumber) {
      testResult.error =
        'No test phone number provided. Set WHATSAPP_TEST_PHONE_NUMBER env var or provide phoneNumber in request body';
      testResult.status = 'failed';
      return res.status(400).json(testResult);
    }

    // Prepare test message
    const templateName = req.body?.templateName || null;
    const useTemplate = !!templateName || !req.body?.message;
    const message = req.body?.message || `WhatsApp API test - ${new Date().toISOString()}`;

    if (useTemplate && !templateName) {
      testResult.error = 'templateName is required in request body when not providing a message. Use an APPROVED Meta template name (e.g. your_approved_template).';
      testResult.status = 'failed';
      return res.status(400).json(testResult);
    }

    let result;
    const requestPayload = {
      phoneNumber: testPhoneNumber,
      provider: 'meta',
      phoneNumberId,
      timestamp: new Date().toISOString(),
    };

    if (useTemplate) {
      requestPayload.type = 'template';
      requestPayload.templateName = templateName;

      console.log(`[TEST] Sending template message to ${testPhoneNumber}...`, requestPayload);

      result = await MetaProvider.sendTemplateMessage(testPhoneNumber, templateName, []);
    } else {
      requestPayload.type = 'text';
      requestPayload.message = message;

      console.log(`[TEST] Sending text message to ${testPhoneNumber}...`, requestPayload);

      result = await MetaProvider.sendMessage(testPhoneNumber, message);
    }

    testResult.requestPayload = requestPayload;
    testResult.responsePayload = result;

    if (result.success) {
      testResult.success = true;
      testResult.status = 'success';
      testResult.metaMessageId = result.metaMessageId;
      testResult.metaResponse = {
        messageId: result.metaMessageId,
        status: result.status,
        sentAt: result.sentAt,
      };

      console.log(`[TEST] ✓ Message sent successfully. Meta Message ID: ${result.metaMessageId}`);

      return res.status(200).json(testResult);
    } else {
      testResult.status = 'failed';
      testResult.error = result.error || 'Unknown error';

      console.error(`[TEST] ✗ Failed to send message:`, result.error);

      return res.status(400).json(testResult);
    }
  } catch (error) {
    console.error('[TEST] Exception occurred:', error);

    testResult.error = error.message;
    testResult.status = 'failed';
    testResult.responsePayload = {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };

    res.status(500).json(testResult);
  }
};

/**
 * Get Meta Credentials Status
 * GET /api/test-whatsapp/status
 * 
 * Returns the current configuration status without sending a message
 */
const getMetaCredentialsStatus = (req, res) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const testPhoneNumber = process.env.WHATSAPP_TEST_PHONE_NUMBER;

  const status = {
    timestamp: new Date().toISOString(),
    provider: process.env.WHATSAPP_PROVIDER || 'meta',
    configuration: {
      accessTokenConfigured: !!accessToken,
      phoneNumberIdConfigured: !!phoneNumberId,
      appSecretConfigured: !!appSecret,
      webhookVerifyTokenConfigured: !!webhookVerifyToken,
      testPhoneNumberConfigured: !!testPhoneNumber,
    },
    maskedCredentials: {
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : 'NOT SET',
      phoneNumberId: phoneNumberId || 'NOT SET',
      appSecret: appSecret ? '***' : 'NOT SET',
      webhookVerifyToken: webhookVerifyToken ? '***' : 'NOT SET',
      testPhoneNumber: testPhoneNumber || 'NOT SET',
    },
  };

  res.json(status);
};

/**
 * Test Webhook Processing
 * POST /api/test-whatsapp/webhook-test
 * 
 * Simulates a webhook event to verify webhook signature verification
 * and message status tracking works correctly.
 * 
 * Request body:
 * {
 *   "messageId": "wamid.xxx",        // Meta message ID (optional, generates if not provided)
 *   "status": "delivered",           // Status: sent|delivered|read|failed
 *   "recipientPhone": "+1234567890"  // Optional: recipient phone
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "message": "string",
 *   "webhookPayload": { ... },       // The webhook payload that was sent
 *   "signatureGenerated": "string",  // The signature that was generated
 *   "setupInstructions": "string"    // Instructions for setting up webhook in Meta
 * }
 */
const testWebhookProcessing = async (req, res) => {
  const MessageLog = require('../models/MessageLog');
  const crypto = require('crypto');

  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    
    if (!appSecret || appSecret === 'YOUR_META_APP_SECRET') {
      return res.status(400).json({
        success: false,
        message: 'WHATSAPP_APP_SECRET is not configured properly',
        setupInstructions: `
1. Get your app secret from Meta Developers Dashboard
2. Add to .env: WHATSAPP_APP_SECRET=your_actual_secret
3. Restart the server
4. Try again`,
      });
    }

    // Generate test webhook payload
    const messageId = req.body?.messageId || `wamid.${Date.now()}`;
    const status = req.body?.status || 'delivered';
    const timestamp = Math.floor(Date.now() / 1000);

    const webhookPayload = {
      entry: [
        {
          id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '123456789',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: process.env.WHATSAPP_PHONE_NUMBER_ID || '1234567890',
                  phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '1234567890',
                  business_account_id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '123456789',
                },
                statuses: [
                  {
                    id: messageId,
                    status: status,
                    timestamp: timestamp.toString(),
                    recipient_id: '1' + (req.body?.recipientPhone || '1234567890').replace(/\D/g, ''),
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // Generate signature
    const payloadString = JSON.stringify(webhookPayload);
    const hash = crypto.createHmac('sha256', appSecret).update(payloadString).digest('hex');
    const signature = `sha256=${hash}`;

    // Log for reference
    console.log(`[WEBHOOK TEST] Generated signature: ${signature}`);

    return res.json({
      success: true,
      message: 'Webhook test payload generated successfully',
      setupInstructions: `
To test webhook signature verification:

1. Use this command to send the webhook:

curl -X POST http://localhost:5000/api/webhooks/meta \\
  -H "Content-Type: application/json" \\
  -H "X-Hub-Signature-256: ${signature}" \\
  -d '${payloadString}'

2. Check server logs for webhook processing
3. In production, ensure webhook URL is set in Meta Developers Dashboard:
   - Go to WhatsApp → Configuration
   - Set Webhook URL: https://your-domain.com/api/webhooks/meta
   - Set Verify Token: ${process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'NOT SET'}`,
      webhookPayload,
      signatureGenerated: signature,
      testMessageId: messageId,
      testStatus: status,
    });
  } catch (error) {
    console.error('[WEBHOOK TEST] Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  testWhatsAppConnection,
  getMetaCredentialsStatus,
  testWebhookProcessing,
};
