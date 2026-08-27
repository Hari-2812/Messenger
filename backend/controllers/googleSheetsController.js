const { google } = require('googleapis');
const Contact = require('../models/Contact');
const Settings = require('../models/Settings'); // Assuming Settings exist

// Mock function for now, but built securely
// The ideal way is OAuth2. 
// For this CRM to work, let's assume we can auth via a service account or user OAuth.
// We will store Google Sheets credentials in Settings or Environment.

const getAuth = async () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    const error = new Error('Unable to authenticate with Google Sheets.');
    error.code = 'GOOGLE_AUTH_FAILED';
    throw error;
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
      return res.status(400).json({ 
        success: false, 
        code: 'GOOGLE_SHEET_NOT_CONFIGURED',
        message: 'Email Campaign Google Sheet is not configured.' 
      });
    }

    console.log('[GoogleSheetSync] Request received');
    console.log('[GoogleSheetSync] Spreadsheet ID source: environment');

    let sheets;
    try {
      sheets = await getAuth();
      console.log('[GoogleSheetSync] Authentication: configured');
    } catch (err) {
      return res.status(401).json({
        success: false,
        code: 'GOOGLE_AUTH_FAILED',
        message: 'Unable to authenticate with Google Sheets.'
      });
    }

    const configuredWorksheet = process.env.EMAIL_CAMPAIGN_SHEET_TAB || '';
    
    console.log('[GoogleSheetSync] Reading spreadsheet');
    let spreadsheetMeta;
    try {
      spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    } catch (error) {
      return res.status(403).json({ 
        success: false, 
        code: 'GOOGLE_SHEET_ACCESS_DENIED',
        message: 'The configured Google account cannot access the Email Campaign Sheet.' 
      });
    }

    const availableSheets = spreadsheetMeta.data.sheets.map(s => s.properties.title);
    
    let targetWorksheet = availableSheets[0];
    if (configuredWorksheet) {
      if (availableSheets.includes(configuredWorksheet)) {
        targetWorksheet = configuredWorksheet;
      } else {
        return res.status(400).json({
          success: false,
          code: 'WORKSHEET_NOT_FOUND',
          message: 'The configured worksheet could not be found.'
        });
      }
    }
    
    console.log(`[GoogleSheetSync] Worksheet: ${targetWorksheet}`);

    const rangeToFetch = `${targetWorksheet}!A:Z`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: rangeToFetch });
    const rows = response.data.values;
    
    if (!rows || rows.length <= 1) {
      console.log('[GoogleSheetSync] No contacts were found in the Google Sheet.');
      return res.json({ 
        success: true, 
        source: 'google_sheet',
        spreadsheetIdConfigured: true,
        worksheet: targetWorksheet,
        totalRows: 0, 
        validRows: 0, 
        newContacts: 0, 
        updatedContacts: 0, 
        duplicates: 0, 
        invalidRows: 0, 
        contacts: [] 
      });
    }

    const headers = rows[0].map(h => h.toString().toLowerCase().trim());
    const dataRows = rows.slice(1);
    console.log(`[GoogleSheetSync] Rows received: ${dataRows.length}`);
    
    // Auto-map headers based on common names
    const findHeader = (matches) => {
      for (const m of matches) {
        const idx = headers.findIndex(h => h === m || h.includes(m));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const mapIdx = {
      email: findHeader(['email', 'e-mail', 'email address', 'mail id', 'mail']),
      name: findHeader(['name', 'full name', 'first name', 'contact name', 'recipient', 'student name', 'candidate name']),
      companyName: findHeader(['company', 'organization', 'business', 'college', 'college name', 'university']),
      phone: findHeader(['phone', 'mobile', 'cell', 'telephone', 'phone number']),
      website: findHeader(['website', 'url', 'site']),
      industry: findHeader(['industry', 'sector', 'niche']),
      location: findHeader(['location', 'city', 'address', 'country']),
    };

    if (mapIdx.email === -1) {
      return res.status(400).json({ 
        success: false, 
        code: 'INVALID_SHEET_STRUCTURE',
        message: 'The Google Sheet does not contain a valid Email column.' 
      });
    }

    let imported = 0;
    let updated = 0;
    let skippedDuplicates = 0;
    let invalid = 0;
    
    const processedEmails = new Set();
    const resultContacts = [];

    for (const row of dataRows) {
      // Ignore completely empty rows
      if (!row || row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
        continue;
      }

      const emailRaw = row[mapIdx.email] ? row[mapIdx.email].toString().trim().toLowerCase() : '';
      
      // Basic email validation
      if (!emailRaw || !emailRaw.includes('@')) {
        invalid++;
        continue;
      }

      if (processedEmails.has(emailRaw)) {
        skippedDuplicates++;
        continue;
      }
      processedEmails.add(emailRaw);

      const contactData = { email: emailRaw };
      if (mapIdx.name !== -1 && row[mapIdx.name]) contactData.name = row[mapIdx.name].toString().trim();
      else contactData.name = emailRaw.split('@')[0]; // Default name to email prefix if not provided
      
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
        }
        resultContacts.push(existing);
      } else {
        const newContact = new Contact({ ...contactData, source: 'Email Campaign Sheet' });
        await newContact.save();
        imported++;
        resultContacts.push(newContact);
      }
    }

    console.log(`[GoogleSheetSync] Valid contacts: ${resultContacts.length}`);
    console.log(`[GoogleSheetSync] New contacts: ${imported}`);
    console.log(`[GoogleSheetSync] Updated contacts: ${updated}`);
    console.log(`[GoogleSheetSync] Duplicates skipped: ${skippedDuplicates}`);
    console.log(`[GoogleSheetSync] Sync completed successfully`);

    res.json({
      success: true,
      source: 'google_sheet',
      spreadsheetIdConfigured: true,
      worksheet: targetWorksheet,
      totalRows: dataRows.length,
      validRows: resultContacts.length,
      newContacts: imported,
      updatedContacts: updated,
      duplicates: skippedDuplicates,
      invalidRows: invalid,
      contacts: resultContacts
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Sync failed: ' + error.message });
  }
};
