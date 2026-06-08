# Meta WhatsApp Cloud API Integration Guide

## Overview

This application has been upgraded to use the **Meta WhatsApp Cloud API** instead of the mock provider. The integration supports sending messages, receiving status updates via webhooks, and managing bulk campaigns with concurrency control.

## Environment Variables

Add the following to your `.env` file:

```env
# Meta WhatsApp Cloud API Configuration
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token

# Campaign Processing Configuration
CAMPAIGN_CONCURRENCY=5
```

## Getting Meta WhatsApp Credentials

1. **Create a Meta Business App**
   - Go to [Meta Developers](https://developers.facebook.com/)
   - Create a new app of type "Business"
   - Add WhatsApp product to your app

2. **Get Access Token**
   - Navigate to App Settings → Basic
   - Copy your App ID and App Secret
   - Go to Messenger API → Settings
   - Generate an access token (use System User tokens for production)

3. **Get Phone Number ID**
   - Go to WhatsApp → Getting Started
   - You'll see your Phone Number ID

4. **Setup Webhook**
   - Your webhook URL: `https://your-domain.com/api/webhooks/meta`
   - Verify Token: Create any random string, add to `.env` as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Webhook fields to subscribe:
     - messages
     - message_status

## Architecture

### File Structure

```
backend/
├── services/
│   ├── MetaProvider.js          # Meta API integration
│   ├── ProviderFactory.js        # Provider switching
│   ├── whatsappProvider.js       # Mock provider (fallback)
│   └── campaignQueue.js          # Queue and concurrency management
├── controllers/
│   ├── campaignController.js     # Campaign logic
│   ├── webhookController.js      # Webhook handlers
│   └── logController.js          # Message logs
├── routes/
│   └── webhookRoutes.js          # Webhook endpoints
└── models/
    └── MessageLog.js             # Updated schema
```

### Message Flow

#### Sending Messages

1. **Campaign Creation**
   ```
   POST /api/campaigns
   → campaignController.createCampaign()
   → campaignQueue.processCampaignWithQueue()
   → MetaProvider.sendMessage() [concurrent batches]
   → MessageLog.create() [status: 'sent']
   ```

2. **Concurrency Control**
   - Default: 5 concurrent requests per batch
   - Configurable via `CAMPAIGN_CONCURRENCY` env var
   - Supports 1000+ contacts without blocking

#### Receiving Status Updates

1. **Meta Webhook Event**
   ```
   POST /api/webhooks/meta
   → webhookController.handleWebhook()
   → Verify X-Hub-Signature-256
   → Extract message status (sent/delivered/read/failed)
   → MessageLog.updateOne() [status updated]
   ```

### Message Statuses

| Status | Description | Set By |
|--------|-------------|--------|
| pending | Message queued, waiting to send | Internal |
| sent | Message accepted by Meta | Webhook callback |
| delivered | Message delivered to device | Webhook callback |
| read | Message read by recipient | Webhook callback |
| failed | Message failed to send | Webhook callback or immediate error |

## API Endpoints

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create and send campaign
- `POST /api/campaigns/preview` - Preview messages
- `POST /api/campaigns/:id/send` - Send draft campaign

### Webhooks
- `GET /api/webhooks/meta` - Webhook verification (Meta)
- `POST /api/webhooks/meta` - Webhook events (Meta)

### Logs
- `GET /api/logs` - Get message logs
- `GET /api/logs/dashboard` - Get dashboard statistics

## Template Variables

Templates support dynamic variable replacement:

```
Hello {{name}},
Your email is {{email}}
```

### Supported Variables
- `{{name}}` - Contact name
- `{{phone}}` - Contact phone
- `{{email}}` - Contact email

## Webhook Security

The webhook endpoint implements **X-Hub-Signature-256** verification:

1. Meta sends `X-Hub-Signature-256` header with value `sha256=<signature>`
2. We verify using `WHATSAPP_APP_SECRET`
3. Invalid signatures are rejected with HTTP 403

## Error Handling

### Common Errors

1. **Invalid Credentials**
   ```
   Error: Meta API Error: Unauthorized
   ```
   → Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID

2. **Invalid Phone Number**
   ```
   Error: Meta API Error: Invalid phone number
   ```
   → Phone numbers must include country code (e.g., +1234567890)

3. **Webhook Verification Failed**
   ```
   Error: Invalid signature
   ```
   → Verify WHATSAPP_APP_SECRET and WHATSAPP_WEBHOOK_VERIFY_TOKEN

## Performance

### Bulk Sending
- **Concurrency**: Configurable via `CAMPAIGN_CONCURRENCY`
- **Rate Limiting**: Respects Meta API rate limits
- **Non-blocking**: Campaigns send in background via Promise.allSettled()

### Recommended Settings
- Small campaigns (< 100): CAMPAIGN_CONCURRENCY = 5
- Medium campaigns (100-1000): CAMPAIGN_CONCURRENCY = 10
- Large campaigns (1000+): CAMPAIGN_CONCURRENCY = 15-20

## Provider Switching

To use the mock provider for testing:

```env
WHATSAPP_PROVIDER=mock
```

The application will automatically switch to the mock provider without code changes.

## Migration from Mock to Production

1. Keep `WHATSAPP_PROVIDER=meta` in .env
2. Add Meta API credentials
3. Restart server - no code changes needed
4. Mock logs created before migration remain in database
5. Dashboard automatically includes logs from both providers

## Monitoring

### Dashboard Metrics
- Total contacts
- Total templates
- Total campaigns
- Messages by status (pending, sent, delivered, read, failed)
- Recent campaigns

### Log Queries
```javascript
// Get all delivered messages
GET /api/logs?status=delivered

// Get logs for specific campaign
GET /api/logs?campaignId=<campaign_id>
```

## Testing

### Test Sending (No Credentials)
```bash
# Use mock provider for testing
WHATSAPP_PROVIDER=mock npm run dev
```

### Test with Real Credentials
1. Add Meta API credentials to .env
2. Create a test contact with valid WhatsApp number
3. Create a campaign and send
4. Check logs for status updates

### Test Webhooks
```bash
curl -X POST http://localhost:5000/api/webhooks/meta \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"entry": [{"changes": [{"value": {"statuses": [{"id": "wamid.xxx", "status": "delivered"}]}}]}]}'
```

## Troubleshooting

### Messages show "failed" status
- Check API logs for error details
- Verify phone number format (must include country code)
- Check daily message limits on phone number

### Webhooks not updating status
- Verify webhook URL is publicly accessible
- Check X-Hub-Signature-256 verification
- Ensure WHATSAPP_APP_SECRET is correct
- Check server logs for webhook processing errors

### Campaign sending stuck
- Check server logs for errors
- Verify Meta API credentials
- Check rate limits
- Check database connection

## Future Enhancements

- [ ] Support for approved WhatsApp templates
- [ ] Media message support (images, documents)
- [ ] Interactive messages (buttons, lists)
- [ ] Message scheduling
- [ ] Redis-based job queue (BullMQ integration)
- [ ] Advanced analytics dashboard
- [ ] A/B testing campaigns
- [ ] Contact segmentation

## Support

For issues with:
- **Meta API**: [Meta WhatsApp API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- **Application**: Check server logs and database
- **Webhooks**: Verify signature and event format

---

**Version**: 1.0.0  
**Last Updated**: 2024
