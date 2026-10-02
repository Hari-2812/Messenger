const validator = require('validator');
const Contact = require('../models/Contact');
const csv = require('csv-parser');
const fs = require('fs');
const ProviderFactory = require('../services/ProviderFactory');
const watiService = require('../services/watiService');
const contactSyncService = require('../services/contactSyncService');

/**
 * Validate and normalize a phone number for Meta WhatsApp API.
 * Strips non-digits, ensures it's between 7-15 digits (E.164 range).
 * @param {string} phone
 * @returns {{ valid: boolean, normalized: string, error?: string }}
 */
const validatePhone = (phone) => {
  if (!phone) return { valid: false, error: 'Phone is required' };
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return { valid: false, error: `Invalid phone number: "${phone}" (must be 7–15 digits)` };
  }
  return { valid: true, normalized: digits };
};

const processContactsInQueue = async (contacts, batchSize = 25) => {
  const results = { imported: 0, synced: 0, failed: 0, pending: 0, errors: [] };

  for (let index = 0; index < contacts.length; index += batchSize) {
    const batch = contacts.slice(index, index + batchSize);
    const createdContacts = await Promise.allSettled(
      batch.map((contactPayload) => Contact.create(contactPayload))
    );

    const savedContacts = [];
    createdContacts.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.imported += 1;
        savedContacts.push(result.value);
      } else {
        results.failed += 1;
        results.errors.push(result.reason?.message || 'Unknown contact import failure');
      }
    });

    if (savedContacts.length > 0) {
      const syncResults = await contactSyncService.syncBulkContacts(savedContacts, batchSize);
      results.synced += syncResults.synced;
      results.failed += syncResults.failed;
      results.pending += syncResults.pending;
      results.errors.push(...syncResults.errors);
    }
  }

  return results;
};

// @desc    Get all contacts (paginated + search)
// @route   GET /api/contacts
const getContacts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(5000, parseInt(req.query.limit) || 50);
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim();

  // Prevent aggressive browser/proxy caching for authenticated API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const baseFilter = req.user?.role === 'admin' ? {} : { userId: req.user._id };
  const filter = search
    ? { ...baseFilter, $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }], isDeleted: { $ne: true } }
    : { ...baseFilter, isDeleted: { $ne: true } };

  const [contacts, total] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Contact.countDocuments(filter),
  ]);

  console.log(`[Diagnostic] GET /api/contacts query for user ${req.user._id}. Total found: ${total}`);

  res.json({ contacts, total, page, pages: Math.ceil(total / limit) });
};

// @desc    Create contact
// @route   POST /api/contacts
const createContact = async (req, res) => {
  const { name, phone, email, tags, source, customFields } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }

  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.valid) {
    return res.status(400).json({ message: phoneCheck.error });
  }

  if (email && email.trim() && !validator.isEmail(email.trim())) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  const existing = await Contact.findOne({ phone: phoneCheck.normalized });
  if (existing) {
    return res.status(400).json({ message: 'Contact with this phone number already exists' });
  }

  const contact = await Contact.create({
    userId: req.user._id,
    name: name.trim(),
    phone: phoneCheck.normalized,
    email: email?.trim() || '',
    tags: Array.isArray(tags) ? tags.map(String).filter(Boolean) : [],
    source: source?.trim() || 'CRM',
    customFields: customFields || {},
    syncStatus: 'pending',
  });

  const syncResult = await contactSyncService.syncSingleContact(contact);

  res.status(201).json({
    ...contact.toObject(),
    syncStatus: syncResult.syncStatus,
    syncError: syncResult.error || contact.syncError,
  });
};

// @desc    Update contact
// @route   PUT /api/contacts/:id
const updateContact = async (req, res) => {
  const { name, phone, email, tags, source, customFields } = req.body;
  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }

  if (phone) {
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ message: phoneCheck.error });
    }
    if (phoneCheck.normalized !== contact.phone) {
      const existing = await Contact.findOne({ phone: phoneCheck.normalized });
      if (existing) {
        return res.status(400).json({ message: 'Another contact with this phone already exists' });
      }
      contact.phone = phoneCheck.normalized;
    }
  }

  if (email && email.trim() && !validator.isEmail(email.trim())) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  contact.name = name?.trim() || contact.name;
  contact.email = email !== undefined ? (email?.trim() || '') : contact.email;
  if (Array.isArray(tags)) contact.tags = tags.map(String).filter(Boolean);
  if (source !== undefined) contact.source = source?.trim() || 'CRM';
  if (customFields !== undefined) contact.customFields = customFields || {};

  await contact.save();
  const syncResult = await contactSyncService.syncSingleContact(contact);

  res.json({
    ...contact.toObject(),
    syncStatus: syncResult.syncStatus,
    syncError: syncResult.error || contact.syncError,
  });
};

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
const deleteContact = async (req, res) => {
  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }

  if (ProviderFactory.getProvider() === 'wati') {
    try {
      console.log(`[Contact Delete] Deleting WATI Contact: ${contact.phone}`);
      const watiRes = await watiService.deleteContact(contact);
      console.log(`[Contact Delete] WATI Delete Response:`, watiRes);
    } catch (err) {
      console.error(`[Contact Delete] Full WATI Error: ${err.message}`);
      contact.syncStatus = 'delete_failed';
      contact.syncError = err.message;
      await contact.save();
      return res.status(500).json({ message: 'WATI delete failed', error: err.message });
    }
  }

  contact.isDeleted = true;
  contact.deletedAt = new Date();
  await contact.save();
  res.json({ message: 'Contact deleted successfully' });
};

// @desc    Bulk delete contacts
// @route   POST /api/contacts/bulk-delete and DELETE /api/contacts/bulk-delete
const bulkDeleteContacts = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'No contact IDs provided' });
  }

  console.log('[Contacts] Bulk delete requested');
  console.log('[Contacts] Selected contact count:', ids.length);

  const validIds = ids.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
  
  if (validIds.length === 0) {
    return res.json({ success: true, message: 'No valid ObjectIds provided', deletedCount: 0, requestedCount: ids.length });
  }

  const baseFilter = req.user?.role === 'admin' ? {} : { userId: req.user._id };
  const filter = { ...baseFilter, _id: { $in: validIds }, isDeleted: { $ne: true } };

  try {
    const contacts = await Contact.find(filter);
    
    if (contacts.length === 0) {
      console.log('[Contacts] Bulk delete completed');
      console.log('[Contacts] Deleted contacts: 0');
      return res.json({ success: true, message: 'No matching valid contacts found', deletedCount: 0, requestedCount: ids.length });
    }

    const contactIdsToDelete = contacts.map(c => c._id);

    // Perform a bulk write to soft-delete
    const result = await Contact.updateMany(
      { _id: { $in: contactIdsToDelete } },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    console.log('[Contacts] Bulk delete completed');
    console.log('[Contacts] Deleted contacts:', result.modifiedCount);

    res.json({ 
      success: true,
      message: `Successfully deleted ${result.modifiedCount} contacts`,
      deletedCount: result.modifiedCount,
      requestedCount: ids.length
    });
  } catch (error) {
    console.error('[Contact Bulk Delete] Error:', error);
    res.status(500).json({ success: false, message: 'Server error during deletion' });
  }
};

// @desc    Sync all unsynced contacts to WATI
// @route   POST /api/contacts/sync-all
const syncAllContacts = async (req, res) => {
  const { getWatiConfig } = require('../config/wati');
  const { accessToken, baseUrl } = getWatiConfig();
  if (!accessToken || !baseUrl) {
    return res.status(400).json({ success: false, message: 'WATI not configured' });
  }

  try {
    const results = await contactSyncService.syncAllContacts();
    res.json({
      success: true,
      total: results.total,
      synced: results.synced,
      failed: results.failed,
    });
  } catch (error) {
    if (error.message === 'WATI not configured') {
      return res.status(400).json({ success: false, message: 'WATI not configured' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Retry sync for a specific contact
// @route   POST /api/contacts/:id/sync-retry
const retrySyncContact = async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) {
    return res.status(404).json({ success: false, message: 'Contact not found' });
  }

  // If retrying a failed delete, route it to deleteContact
  if (contact.syncStatus === 'delete_failed') {
    req.params.id = contact._id;
    return deleteContact(req, res);
  }

  const syncResult = await contactSyncService.syncContactById(req.params.id);

  if (syncResult.error === 'Contact not found') {
    return res.status(404).json({ success: false, message: 'Contact not found' });
  }

  if (syncResult.success) {
    return res.json({
      success: true,
      message: 'Contact synced with WATI',
      syncStatus: 'synced',
      contact: syncResult.contact,
    });
  }

  return res.status(422).json({
    success: false,
    syncStatus: 'failed',
    error: syncResult.error || 'Sync failed',
    contact: syncResult.contact,
  });
};

// Patch for importContacts & bulkImportContacts in contactController.js

const buildImportResponse = (reqCount, validCount, invalidCount, duplicatesSkippedCount, result, error, rowErrors) => {
  let imported = 0;
  let updated = 0;
  let skipped = duplicatesSkippedCount;
  let failed = invalidCount;
  let errorDetails = [...rowErrors];

  if (result) {
    imported = result.upsertedCount || 0;
    updated = result.modifiedCount || 0;
    skipped += ((result.matchedCount || 0) - updated);
  } else if (error && error.writeErrors) {
    imported = error.result?.upsertedCount || 0;
    updated = error.result?.modifiedCount || 0;
    skipped += ((error.result?.matchedCount || 0) - updated);
    
    failed += error.writeErrors.length;
    const writeErrorDetails = error.writeErrors.slice(0, 20).map(we => ({
      index: we.index,
      code: we.code,
      reason: we.errmsg
    }));
    errorDetails = [...errorDetails, ...writeErrorDetails];
  } else if (error) {
    // Fatal error
    return {
      success: false,
      message: 'Fatal error during import: ' + error.message,
      totalRows: reqCount,
      validRows: validCount,
      created: 0,
      updated: 0,
      skipped: skipped,
      failed: reqCount,
      imported: 0, // Legacy support
      duplicatesSkipped: skipped // Legacy support
    };
  }

  const success = (imported > 0 || updated > 0);
  
  return {
    success: success,
    message: success ? 'Import completed' : 'Import failed or no new records added',
    // Requested exact structure
    totalRows: reqCount,
    validRows: validCount,
    created: imported,
    updated: updated,
    skipped: skipped,
    failed: failed,
    errorDetails: errorDetails.slice(0, 50),
    // Legacy support for Contacts.jsx toast
    total: reqCount,
    imported: imported,
    duplicatesSkipped: skipped,
    invalid: invalidCount,
    errors: errorDetails.length
  };
};

const importContacts = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a file' });
  }

  const filePath = req.file.path;
  const results = [];
  let invalid = 0;
  let duplicatesSkipped = 0;
  const validOperations = [];
  const processedKeys = new Set();
  const rowErrors = [];

  try {
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => results.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const xlsx = require('xlsx');
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      results.push(...data);
    } else {
      return res.status(400).json({ message: 'Unsupported file format. Please upload a CSV or Excel file.' });
    }

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const name = (row.Name || row.name || '').trim();
      const rawPhone = (row.Phone || row.phone || '').trim();
      const email = (row.Email || row.email || '').toString().trim().toLowerCase();
      const tags = (row.Tags || row.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
      const source = (row.Source || row.source || 'CSV').trim();
      
      const college = (row.College || row.college || '').trim();
      const department = (row.Department || row.department || '').trim();

      if (!name) {
        invalid++;
        rowErrors.push({ row: i + 1, reason: 'Missing name' });
        continue;
      }

      if (!rawPhone && !email) {
        invalid++;
        rowErrors.push({ row: i + 1, reason: 'Must provide either phone or email' });
        continue;
      }

      let normalizedPhone = '';
      if (rawPhone) {
        const phoneCheck = validatePhone(rawPhone);
        if (!phoneCheck.valid) {
          invalid++;
          rowErrors.push({ row: i + 1, reason: phoneCheck.error });
          continue;
        }
        normalizedPhone = phoneCheck.normalized;
      }

      if (email && !validator.isEmail(email)) {
        invalid++;
        rowErrors.push({ row: i + 1, reason: `Invalid email format: ${email}` });
        continue;
      }

      const dedupeKey = email || normalizedPhone;
      if (processedKeys.has(dedupeKey)) {
        duplicatesSkipped++;
        continue;
      }
      processedKeys.add(dedupeKey);

      const customFields = {};
      if (college) customFields.College = college;
      if (department) customFields.Department = department;

      const updateDoc = {
        $set: {
          userId: req.user._id,
          name: name,
          tags,
          source,
          customFields,
          isDeleted: false,
          deletedAt: null
        },
        $setOnInsert: {
          syncStatus: 'pending',
          createdAt: new Date()
        }
      };

      if (email) {
        updateDoc.$setOnInsert.email = email;
        if (normalizedPhone) {
          updateDoc.$set.phone = normalizedPhone;
        } else {
          updateDoc.$setOnInsert.phone = `EMAIL_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        }
      } else {
        updateDoc.$setOnInsert.phone = normalizedPhone;
        updateDoc.$setOnInsert.email = '';
      }

      validOperations.push({
        updateOne: {
          filter: email ? { email, userId: req.user._id } : { phone: normalizedPhone, userId: req.user._id },
          update: updateDoc,
          upsert: true
        }
      });
    }
  } catch (parseError) {
    console.error('[ContactImport] Parse error:', parseError);
    return res.status(500).json({ message: 'Error parsing the uploaded file.' });
  } finally {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (cleanupErr) {
      console.error('[ContactImport] Failed to delete temp file:', cleanupErr.message);
    }
  }

  if (validOperations.length === 0) {
    return res.json(buildImportResponse(results.length, 0, invalid, duplicatesSkipped, null, null, rowErrors));
  }

  try {
    const result = await Contact.bulkWrite(validOperations, { ordered: false });
    return res.json(buildImportResponse(results.length, validOperations.length, invalid, duplicatesSkipped, result, null, rowErrors));
  } catch (error) {
    if (error.writeErrors) {
      return res.json(buildImportResponse(results.length, validOperations.length, invalid, duplicatesSkipped, null, error, rowErrors));
    }
    console.error('[ContactImport] Fatal Error:', error);
    const fatalResp = buildImportResponse(results.length, validOperations.length, invalid, duplicatesSkipped, null, error, rowErrors);
    return res.status(500).json(fatalResp);
  }
};

const bulkImportContacts = async (req, res) => {
  const { contacts } = req.body;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ success: false, code: 'CONTACT_IMPORT_EMPTY', message: 'No contacts provided.' });
  }

  let invalid = 0;
  let duplicatesSkipped = 0;
  const validOperations = [];
  const processedKeys = new Set();
  const rowErrors = [];

  for (let i = 0; i < contacts.length; i++) {
    const row = contacts[i];
    const rawEmail = row.email ? row.email.toString().trim().toLowerCase() : '';
    const rawPhone = row.phone ? validatePhone(row.phone).normalized : '';
    const name = row.name ? row.name.toString().trim() : '';

    if (!rawEmail && !rawPhone) {
      invalid++;
      rowErrors.push({ row: i + 1, reason: 'Missing both email and phone' });
      continue;
    }

    if (rawEmail && !validator.isEmail(rawEmail)) {
      invalid++;
      rowErrors.push({ row: i + 1, reason: `Invalid email format: ${rawEmail}` });
      continue;
    }

    const dedupeKey = rawEmail || rawPhone;
    if (processedKeys.has(dedupeKey)) {
      duplicatesSkipped++;
      continue;
    }
    processedKeys.add(dedupeKey);

    const updateDoc = {
      $set: {
        userId: req.user._id,
        name: name || rawEmail?.split('@')[0] || rawPhone || 'Unknown',
        source: 'Manual Import',
        isDeleted: false,
        deletedAt: null
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    };

    if (rawEmail) {
      updateDoc.$setOnInsert.email = rawEmail;
      if (rawPhone) {
        updateDoc.$set.phone = rawPhone;
      } else {
        updateDoc.$setOnInsert.phone = `EMAIL_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      }
    } else {
      updateDoc.$setOnInsert.phone = rawPhone;
      updateDoc.$setOnInsert.email = ''; 
    }

    validOperations.push({
      updateOne: {
        filter: rawEmail ? { email: rawEmail, userId: req.user._id } : { phone: rawPhone, userId: req.user._id },
        update: updateDoc,
        upsert: true
      }
    });
  }

  if (validOperations.length === 0) {
    const resp = buildImportResponse(contacts.length, 0, invalid, duplicatesSkipped, null, null, rowErrors);
    return res.status(400).json(resp);
  }

  try {
    const result = await Contact.bulkWrite(validOperations, { ordered: false });
    return res.json(buildImportResponse(contacts.length, validOperations.length, invalid, duplicatesSkipped, result, null, rowErrors));
  } catch (error) {
    if (error.writeErrors) {
      return res.json(buildImportResponse(contacts.length, validOperations.length, invalid, duplicatesSkipped, null, error, rowErrors));
    }
    console.error('[BulkImport] Fatal Error:', error);
    const fatalResp = buildImportResponse(contacts.length, validOperations.length, invalid, duplicatesSkipped, null, error, rowErrors);
    return res.status(500).json(fatalResp);
  }
};


module.exports = {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  bulkDeleteContacts,
  importContacts,
  bulkImportContacts,
  syncAllContacts,
  retrySyncContact,
};
