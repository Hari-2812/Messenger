/**
 * Meta WhatsApp API Diagnostic Tool
 * Run this to verify your Meta integration setup
 */

require('dotenv').config();
const https = require('https');

const GRAPH_API_VERSION = 'v23.0';
const GRAPH_API_URL = 'https://graph.facebook.com';

async function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${GRAPH_API_URL}/${GRAPH_API_VERSION}${endpoint}`);
    
    if (method === 'GET' && data) {
      Object.entries(data).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
          });
        }
      });
    });

    req.on('error', reject);

    if (method !== 'GET' && data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runDiagnostics() {
  console.log('\n=== Meta WhatsApp Integration Diagnostic ===\n');

  // 1. Check environment variables
  console.log('1. CHECKING ENVIRONMENT VARIABLES');
  console.log('   ✓ WHATSAPP_PROVIDER:', process.env.WHATSAPP_PROVIDER || 'NOT SET');
  console.log('   ✓ WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN ? '***SET***' : 'NOT SET');
  console.log('   ✓ WHATSAPP_PHONE_NUMBER_ID:', process.env.WHATSAPP_PHONE_NUMBER_ID || 'NOT SET');
  console.log('   ✓ WHATSAPP_BUSINESS_ACCOUNT_ID:', process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'NOT SET');
  console.log('   ✓ WHATSAPP_APP_SECRET:', process.env.WHATSAPP_APP_SECRET === 'YOUR_META_APP_SECRET' ? 'PLACEHOLDER' : '***SET***');
  console.log('   ✓ WHATSAPP_WEBHOOK_VERIFY_TOKEN:', process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? '***SET***' : 'NOT SET');
  console.log('   ✓ WHATSAPP_TEST_PHONE_NUMBER:', process.env.WHATSAPP_TEST_PHONE_NUMBER || 'NOT SET');

  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    console.error('\n   ✗ CRITICAL: WHATSAPP_ACCESS_TOKEN is not configured');
    return;
  }

  // 2. Test API Connectivity
  console.log('\n2. TESTING META API CONNECTIVITY');
  try {
    const response = await makeRequest('GET', '/me', {
      access_token: process.env.WHATSAPP_ACCESS_TOKEN,
      fields: 'id,name',
    });

    if (response.status === 200) {
      console.log('   ✓ API Connection: SUCCESS');
      console.log('   ✓ App ID:', response.body.id);
    } else if (response.status === 400 && response.body?.error?.message?.includes('Invalid OAuth access token')) {
      console.error('   ✗ API Connection: FAILED - Invalid or expired access token');
      console.log('   → Get a new token from Meta Developers Dashboard');
    } else {
      console.error('   ✗ API Connection: FAILED');
      console.log('   → Response:', response.body);
    }
  } catch (error) {
    console.error('   ✗ API Connection: ERROR -', error.message);
  }

  // 3. Test Phone Number ID
  console.log('\n3. VERIFYING PHONE NUMBER ID');
  if (process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const response = await makeRequest('GET', `/${process.env.WHATSAPP_PHONE_NUMBER_ID}`, {
        fields: 'id,display_phone_number,quality_rating',
      });

      if (response.status === 200) {
        console.log('   ✓ Phone Number ID: VALID');
        console.log('   ✓ Display Phone:', response.body.display_phone_number);
        console.log('   ✓ Quality Rating:', response.body.quality_rating || 'N/A');
      } else {
        console.error('   ✗ Phone Number ID: INVALID');
        console.log('   → Response:', response.body);
      }
    } catch (error) {
      console.error('   ✗ Phone Number ID: ERROR -', error.message);
    }
  }

  // 4. Webhook Configuration Check
  console.log('\n4. WEBHOOK CONFIGURATION');
  if (process.env.WHATSAPP_APP_SECRET === 'YOUR_META_APP_SECRET') {
    console.error('   ✗ WHATSAPP_APP_SECRET: PLACEHOLDER VALUE');
    console.log('   → Get your App Secret from Meta Developers Dashboard');
    console.log('   → Update WHATSAPP_APP_SECRET in .env');
  } else {
    console.log('   ✓ WHATSAPP_APP_SECRET: CONFIGURED');
  }
  console.log('   ✓ WHATSAPP_WEBHOOK_VERIFY_TOKEN:', process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'NOT SET');
  console.log('   → Webhook URL: https://your-domain.com/api/webhooks/meta');

  // 5. Test Phone Numbers
  console.log('\n5. TEST PHONE NUMBERS');
  if (!process.env.WHATSAPP_TEST_PHONE_NUMBER) {
    console.warn('   ⚠ WHATSAPP_TEST_PHONE_NUMBER: NOT SET');
    console.log('   → Set this to send test messages');
  } else {
    console.log('   ✓ WHATSAPP_TEST_PHONE_NUMBER:', process.env.WHATSAPP_TEST_PHONE_NUMBER);
  }
  console.log('\n   ⚠ IMPORTANT: Test phone numbers must be registered in Meta Business Account');
  console.log('   → Go to Meta Developers Dashboard → WhatsApp → Settings');
  console.log('   → Add test phone numbers under "Test recipients"');

  // 6. Recommendations
  console.log('\n6. NEXT STEPS');
  console.log('   1. If API Connection failed:');
  console.log('      → Get a new access token from Meta Developers Dashboard');
  console.log('      → Update WHATSAPP_ACCESS_TOKEN in .env');
  console.log('   2. If Phone Number ID invalid:');
  console.log('      → Verify you have the correct WHATSAPP_PHONE_NUMBER_ID');
  console.log('      → From WhatsApp setup page in Meta Developers');
  console.log('   3. To enable test message sending:');
  console.log('      → Register test phone numbers in Meta Business Account');
  console.log('      → Add them as WHATSAPP_TEST_PHONE_NUMBER in .env');
  console.log('   4. Webhook setup:');
  console.log('      → Update WHATSAPP_APP_SECRET with real value');
  console.log('      → Configure webhook URL and verify token in Meta');

  console.log('\n=== Diagnostic Complete ===\n');
}

runDiagnostics().catch(console.error);
