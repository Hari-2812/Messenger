const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5000/api';
let token = '';

const tests = [];
const pass = (name) => tests.push({ name, ok: true });
const fail = (name, err) => tests.push({ name, ok: false, err: err.message || String(err) });

async function request(method, url, body, isForm = false) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let fetchBody = body;
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${url}`, { method, headers, body: fetchBody });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}

async function importCSV() {
  const boundary = '----FormBoundary' + Date.now();
  const filePath = path.join(__dirname, '../sample-contacts.csv');
  const fileContent = fs.readFileSync(filePath);

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample-contacts.csv"\r\nContent-Type: text/csv\r\n\r\n`),
    fileContent,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await fetch(`${BASE}/contacts/import`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}

async function run() {
  try {
    const health = await request('GET', '/health');
    if (health.status === 'ok') pass('Health check');
    else fail('Health check', new Error('Bad status'));
  } catch (e) {
    fail('Health check', e);
  }

  try {
    const login = await request('POST', '/auth/login', {
      email: 'admin@campaign.com',
      password: 'admin123',
    });
    token = login.token;
    if (token) pass('Login');
    else fail('Login', new Error('No token'));
  } catch (e) {
    fail('Login', e);
  }

  try {
    await request('POST', '/contacts', { name: 'Test User', phone: '911111111111', email: 'test@test.com' });
    pass('Create contact');
  } catch (e) {
    fail('Create contact', e);
  }

  try {
    const imported = await importCSV();
    if (imported.imported >= 0) pass('CSV import');
    else fail('CSV import', new Error('Bad response'));
  } catch (e) {
    fail('CSV import', e);
  }

  let contacts;
  try {
    contacts = await request('GET', '/contacts');
    if (contacts.length > 0) pass('Get contacts');
    else fail('Get contacts', new Error('Empty'));
  } catch (e) {
    fail('Get contacts', e);
  }

  let templateId;
  try {
    const template = await request('POST', '/templates', {
      title: 'Welcome',
      message: 'Hello {{name}}\n\nWelcome to our program.',
    });
    templateId = template._id;
    pass('Create template');
  } catch (e) {
    fail('Create template', e);
  }

  try {
    const contactIds = contacts.slice(0, 2).map((c) => c._id);
    const preview = await request('POST', '/campaigns/preview', { templateId, contactIds });
    if (preview.length > 0 && preview[0].message.includes('Hello')) pass('Campaign preview');
    else fail('Campaign preview', new Error('Bad preview'));
  } catch (e) {
    fail('Campaign preview', e);
  }

  try {
    const contactIds = contacts.slice(0, 2).map((c) => c._id);
    const campaign = await request('POST', '/campaigns', {
      campaignName: 'Test Campaign',
      templateId,
      contactIds,
      send: true,
    });
    if (campaign.status === 'completed') pass('Send campaign');
    else fail('Send campaign', new Error(`Status: ${campaign.status}`));
  } catch (e) {
    fail('Send campaign', e);
  }

  try {
    const logs = await request('GET', '/logs');
    if (logs.length > 0) pass('Get logs');
    else fail('Get logs', new Error('Empty logs'));
  } catch (e) {
    fail('Get logs', e);
  }

  try {
    const dashboard = await request('GET', '/logs/dashboard');
    if (dashboard.totalContacts >= 0) pass('Dashboard stats');
    else fail('Dashboard stats', new Error('Bad stats'));
  } catch (e) {
    fail('Dashboard stats', e);
  }

  console.log('\n=== API Test Results ===\n');
  tests.forEach((t) => {
    console.log(`${t.ok ? 'PASS' : 'FAIL'} ${t.name}${t.err ? ` - ${t.err}` : ''}`);
  });

  const failed = tests.filter((t) => !t.ok);
  console.log(`\n${tests.length - failed.length}/${tests.length} passed`);
  process.exit(failed.length > 0 ? 1 : 0);
}

run();
