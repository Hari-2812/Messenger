const { google } = require('googleapis');
const Contact = require('../models/Contact');
const Settings = require('../models/Settings'); // Assuming Settings exist

// Mock function for now, but built securely
// The ideal way is OAuth2. 
// For this CRM to work, let's assume we can auth via a service account or user OAuth.
// We will store Google Sheets credentials in Settings or Environment.

const getAuth = async () => {
  // If the user wants to connect without OAuth just for the sake of demo/testing, 
  // we could just accept a publicly shared sheet ID, or require API key in .env.
  // We'll use API Key from .env if present.
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not configured in environment variables.');
  }
  return google.sheets({ version: 'v4', auth: apiKey });
};

const extractSheetId = (urlOrId) => {
  if (urlOrId.includes('/d/')) {
    return urlOrId.split('/d/')[1].split('/')[0];
  }
  return urlOrId;
};

exports.connectSheet = async (req, res) => {
  try {
    const { sheetUrlOrId } = req.body;
    if (!sheetUrlOrId) {
      return res.status(400).json({ success: false, message: 'Sheet ID or URL is required.' });
    }

    const sheetId = extractSheetId(sheetUrlOrId);
    const sheets = await getAuth();
    
    // Test fetch the sheet metadata to ensure it's accessible
    const response = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    
    res.json({
      success: true,
      message: 'Sheet connected successfully',
      sheetId,
      title: response.data.properties.title,
      sheets: response.data.sheets.map(s => s.properties.title)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to connect to Google Sheet: ' + error.message });
  }
};

exports.previewColumns = async (req, res) => {
  try {
    const { sheetId, sheetName } = req.query;
    if (!sheetId) return res.status(400).json({ success: false, message: 'Sheet ID is required.' });

    const sheets = await getAuth();
    const range = sheetName ? `${sheetName}!A1:Z1` : 'A1:Z1'; // First row
    
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    const columns = response.data.values && response.data.values[0] ? response.data.values[0] : [];
    
    res.json({ success: true, columns });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch columns: ' + error.message });
  }
};

exports.syncContacts = async (req, res) => {
  try {
    const { sheetId, sheetName, mapping } = req.body;
    if (!sheetId || !mapping || !mapping.email) {
      return res.status(400).json({ success: false, message: 'Sheet ID and mapping with email field are required.' });
    }

    const sheets = await getAuth();
    const range = sheetName ? `${sheetName}!A:Z` : 'A:Z';
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    
    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return res.json({ success: true, imported: 0, skipped: 0, total: 0 });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    let imported = 0;
    let skipped = 0;
    let updated = 0;

    for (const row of dataRows) {
      const contactData = {};
      
      // Build contactData from mapping
      for (const [crmField, sheetColumnName] of Object.entries(mapping)) {
        const colIndex = headers.indexOf(sheetColumnName);
        if (colIndex !== -1 && row[colIndex]) {
          contactData[crmField] = row[colIndex].trim();
        }
      }

      if (!contactData.email) {
        skipped++;
        continue;
      }

      // Upsert contact based on email
      const existing = await Contact.findOne({ email: contactData.email });
      if (existing) {
        // Update
        Object.assign(existing, contactData);
        await existing.save();
        updated++;
      } else {
        // Insert
        const newContact = new Contact(contactData);
        await newContact.save();
        imported++;
      }
    }

    res.json({
      success: true,
      message: 'Sync completed',
      total: dataRows.length,
      imported,
      updated,
      skipped
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Sync failed: ' + error.message });
  }
};

exports.syncCampaignSheet = async (req, res) => {
  try {
    const sheetId = process.env.EMAIL_CAMPAIGN_SHEET_ID;
    if (!sheetId) {
      return res.status(400).json({ success: false, message: 'EMAIL_CAMPAIGN_SHEET_ID is not configured in Render environment variables.' });
    }

    const sheets = await getAuth();
    const sheetName = process.env.EMAIL_CAMPAIGN_SHEET_TAB || '';
    
    let rangeToFetch = 'A:Z';
    if (sheetName) {
      rangeToFetch = `${sheetName}!A:Z`;
    }

    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: rangeToFetch });
    const rows = response.data.values;
    
    if (!rows || rows.length <= 1) {
      return res.json({ success: true, imported: 0, updated: 0, skipped: 0, invalid: 0, total: 0 });
    }

    const headers = rows[0].map(h => h.toString().toLowerCase().trim());
    const dataRows = rows.slice(1);
    
    // Auto-map headers based on common names
    const findHeader = (matches) => {
      for (const m of matches) {
        const idx = headers.findIndex(h => h === m || h.includes(m));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const mapIdx = {
      email: findHeader(['email', 'e-mail', 'email address']),
      name: findHeader(['name', 'full name', 'first name', 'contact name', 'recipient']),
      companyName: findHeader(['company', 'organization', 'business']),
      phone: findHeader(['phone', 'mobile', 'cell', 'telephone']),
      website: findHeader(['website', 'url', 'site']),
      industry: findHeader(['industry', 'sector', 'niche']),
      location: findHeader(['location', 'city', 'address', 'country']),
    };

    if (mapIdx.email === -1) {
      return res.status(400).json({ success: false, message: 'Could not find an Email column in the spreadsheet. Please ensure a column contains "Email".' });
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let invalid = 0;

    for (const row of dataRows) {
      const email = row[mapIdx.email] ? row[mapIdx.email].toString().trim() : '';
      
      // Basic email validation
      if (!email || !email.includes('@')) {
        invalid++;
        continue;
      }

      const contactData = { email };
      if (mapIdx.name !== -1 && row[mapIdx.name]) contactData.name = row[mapIdx.name].toString().trim();
      else contactData.name = email.split('@')[0]; // Default name to email prefix if not provided
      
      if (mapIdx.companyName !== -1 && row[mapIdx.companyName]) contactData.companyName = row[mapIdx.companyName].toString().trim();
      if (mapIdx.phone !== -1 && row[mapIdx.phone]) contactData.phone = row[mapIdx.phone].toString().trim();
      if (mapIdx.website !== -1 && row[mapIdx.website]) contactData.website = row[mapIdx.website].toString().trim();
      if (mapIdx.industry !== -1 && row[mapIdx.industry]) contactData.industry = row[mapIdx.industry].toString().trim();
      if (mapIdx.location !== -1 && row[mapIdx.location]) contactData.location = row[mapIdx.location].toString().trim();

      const existing = await Contact.findOne({ email: contactData.email });
      if (existing) {
        // Update fields but protect unsubscribe state and campaign history
        let isModified = false;
        
        ['name', 'companyName', 'phone', 'website', 'industry', 'location'].forEach(field => {
          if (contactData[field] && existing[field] !== contactData[field]) {
            existing[field] = contactData[field];
            isModified = true;
          }
        });

        if (isModified) {
          await existing.save();
          updated++;
        } else {
          skipped++;
        }
      } else {
        const newContact = new Contact({ ...contactData, source: 'Email Campaign Sheet' });
        await newContact.save();
        imported++;
      }
    }

    res.json({
      success: true,
      message: 'Sync completed',
      total: dataRows.length,
      imported,
      updated,
      skipped,
      invalid
    });

  } catch (error) {
    if (error.code === 403 || error.code === 404) {
      return res.status(403).json({ success: false, message: 'The configured Google account does not have access to this spreadsheet. Ensure it is shared as "Anyone with the link can view".' });
    }
    res.status(500).json({ success: false, message: 'Sync failed: ' + error.message });
  }
};
