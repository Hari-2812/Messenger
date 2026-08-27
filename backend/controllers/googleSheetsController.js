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
