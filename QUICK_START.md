# Meta WhatsApp Integration - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

This installs:
- `bullmq` - For queue management (optional, uses Promise.allSettled by default)
- `redis` - For queue persistence (optional)

### Step 2: Get Meta API Credentials

1. **Create Meta Business App** at https://developers.facebook.com
2. **Add WhatsApp Product**
3. **Get these values:**
   - `App ID` and `App Secret`
   - `Phone Number ID` (from WhatsApp setup)
   - `Business Account ID`
   - Generate `Access Token`

### Step 3: Configure .env

Edit `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/whatsapp_campaign
JWT_SECRET=whatsapp_campaign_secret_key_2024
JWT_EXPIRES_IN=7d

# Meta WhatsApp Configuration (REQUIRED FOR PRODUCTION)
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_WEBHOOK_VERIFY_TOKEN=any_random_string

# Campaign Settings
CAMPAIGN_CONCURRENCY=5
```

### Step 4: Setup Webhook in Meta

1. Go to Meta Business Account → WhatsApp → Configuration
2. Set webhook URL: `https://yourdomain.com/api/webhooks/meta`
3. Set verify token: (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
4. Subscribe to:
   - `messages`
   - `message_status`

### Step 5: Start Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

---

## 🧪 Testing Without Meta Credentials

**For development/testing:**

```env
WHATSAPP_PROVIDER=mock
```

Messages will log to console instead of sending via Meta API.

---

## ✅ Verify Setup

### Test Health Endpoint
```bash
curl http://localhost:5000/api/health
# Response: {"status":"ok","message":"WhatsApp Campaign Manager API"}
```

### Test with Postman

**1. Login**
```
POST http://localhost:5000/api/auth/login
Body:
{
  "email": "admin@campaign.com",
  "password": "admin123"
}

Response: {"token": "..."}
```

**2. Create Contact**
```
POST http://localhost:5000/api/contacts
Headers: Authorization: Bearer {token}
Body:
{
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com"
}
```

**3. Create Template**
```
POST http://localhost:5000/api/templates
Headers: Authorization: Bearer {token}
Body:
{
  "title": "Welcome",
  "message": "Hello {{name}}, welcome to our service!"
}
```

**4. Send Campaign**
```
POST http://localhost:5000/api/campaigns
Headers: Authorization: Bearer {token}
Body:
{
  "campaignName": "Welcome Campaign",
  "templateId": "{template_id_from_step_3}",
  "contactIds": ["{contact_id_from_step_2}"],
  "send": true
}

Response:
{
  "campaignName": "Welcome Campaign",
  "status": "sending",
  "sentCount": 0,
  "failedCount": 0,
  ...
}
```

**5. Check Logs**
```
GET http://localhost:5000/api/logs
Headers: Authorization: Bearer {token}

Response: Array of message logs with statuses
```

---

## 🔍 Verify Webhook Setup

### Test Webhook Verification

```bash
curl -X GET "http://localhost:5000/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_TOKEN"

# Expected response: CHALLENGE_TOKEN
# If you see this, webhook verification is working!
```

### Simulate Status Update

```bash
# This would be sent by Meta after delivery

curl -X POST http://localhost:5000/api/webhooks/meta \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=..." \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "statuses": [{
            "id": "wamid.xxx",
            "status": "delivered",
            "timestamp": "1717755060"
          }]
        }
      }]
    }]
  }'

# Expected response: {"received": true}
```

---

## 📊 Check Logs

**View all message logs:**
```
GET http://localhost:5000/api/logs
```

**Filter by campaign:**
```
GET http://localhost:5000/api/logs?campaignId=ID
```

**Dashboard stats:**
```
GET http://localhost:5000/api/logs/dashboard
```

**Expected response:**
```json
{
  "totalContacts": 1,
  "totalTemplates": 1,
  "totalCampaigns": 1,
  "totalMessagesSent": 1,
  "totalMessagesDelivered": 0,
  "totalMessagesRead": 0,
  "totalMessagesFailed": 0,
  "totalMessagesPending": 0,
  "recentCampaigns": [...]
}
```

---

## 🐛 Troubleshooting

### Server won't start
```
Error: Cannot find module 'bullmq'
→ Run: npm install
→ Restart: npm run dev
```

### Messages show "failed" immediately
```
Error: Meta WhatsApp API credentials are not configured
→ Check WHATSAPP_ACCESS_TOKEN is set in .env
→ Check WHATSAPP_PHONE_NUMBER_ID is set in .env
→ Restart server
```

### Webhook not receiving updates
```
→ Verify webhook URL is accessible from internet
→ Check Meta settings have correct webhook URL
→ Verify verify_token matches WHATSAPP_WEBHOOK_VERIFY_TOKEN
→ Check server logs: npm run dev
```

### Invalid phone number error
```
→ Phone must be valid WhatsApp number
→ Format: country code + number (e.g., +1234567890)
→ Number must be active on WhatsApp
```

---

## 📁 Project Structure (Updated)

```
backend/
├── services/
│   ├── MetaProvider.js          ← Real Meta API
│   ├── ProviderFactory.js        ← Switch providers
│   ├── whatsappProvider.js       ← Mock (fallback)
│   └── campaignQueue.js          ← Concurrent sending
├── controllers/
│   ├── campaignController.js     ← Updated
│   ├── webhookController.js      ← New
│   └── logController.js          ← Updated
├── routes/
│   └── webhookRoutes.js          ← New
├── models/
│   └── MessageLog.js             ← Extended
├── server.js                     ← Updated
├── .env                          ← Updated
├── package.json                  ← Updated
├── META_INTEGRATION.md           ← Detailed docs
└── IMPLEMENTATION_SUMMARY.md     ← Technical details
```

---

## 🎯 Next Steps

1. **Development**
   - Keep `WHATSAPP_PROVIDER=mock` during development
   - Test workflows without Meta credentials
   - Run: `npm run dev`

2. **Production**
   - Set `WHATSAPP_PROVIDER=meta`
   - Add real Meta credentials
   - Configure webhook URL in Meta
   - Deploy to server with HTTPS

3. **Monitoring**
   - Watch logs for webhook updates
   - Monitor API rate limits
   - Track message delivery rates
   - Set up alerts for failures

---

## 📞 Support

- **Meta API Docs**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **Integration Guide**: See `META_INTEGRATION.md`
- **Technical Details**: See `IMPLEMENTATION_SUMMARY.md`

---

## ✨ Key Features Ready

✅ Real Meta WhatsApp API integration
✅ Webhook-based status updates (sent, delivered, read, failed)
✅ Concurrent message sending (5-20 per batch)
✅ X-Hub-Signature-256 webhook verification
✅ Provider switching (Mock ↔ Meta)
✅ Complete message tracking
✅ Dashboard with real-time metrics
✅ CSV contact import
✅ Template variable replacement
✅ Secure environment-based configuration

---

**Ready to send real WhatsApp messages!** 🚀
