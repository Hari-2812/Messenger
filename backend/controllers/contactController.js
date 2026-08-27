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
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim();

  const filter = search
    ? { $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }], isDeleted: { $ne: true } }
    : { isDeleted: { $ne: true } };

  const [contacts, total] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Contact.countDocuments(filter),
  ]);

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
// @route   POST /api/contacts/bulk-delete
const bulkDeleteContacts = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'No contact IDs provided' });
  }

  // Use req.user._id if authentication is applied
  const filter = { _id: { $in: ids }, isDeleted: { $ne: true } };
  if (req.user && req.user._id) {
    filter.userId = req.user._id; // Enforce ownership if userId is tracked
  }

  try {
    const contacts = await Contact.find(filter);
    
    if (contacts.length === 0) {
      return res.status(404).json({ success: false, message: 'No valid contacts found or unauthorized' });
    }

    const contactIdsToDelete = contacts.map(c => c._id);

    // Perform a bulk write to soft-delete
    const result = await Contact.updateMany(
      { _id: { $in: contactIdsToDelete } },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    res.json({ 
      success: true,
      message: `Successfully deleted ${result.modifiedCount} contacts`,
      deletedCount: result.modifiedCount
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

// @desc    Import contacts from CSV
// @route   POST /api/contacts/import
const importContacts = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a file' });
  }

  const filePath = req.file.path;
  const results = [];
  const errors = [];
  const pendingContacts = [];
  let skipped = 0;

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

    // To prevent in-batch duplicates
    const seenPhones = new Set();
    const seenEmails = new Set();

    for (const row of results) {
      const name = (row.Name || row.name || '').trim();
      const rawPhone = (row.Phone || row.phone || '').trim();
      const email = (row.Email || row.email || '').trim();
      const tags = (row.Tags || row.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
      const source = (row.Source || row.source || 'CSV').trim();
      
      const college = (row.College || row.college || '').trim();
      const department = (row.Department || row.department || '').trim();

      if (!name) {
        errors.push({ row, reason: 'Missing name' });
        continue;
      }

      if (!rawPhone && !email) {
        errors.push({ row, reason: 'Must provide either phone or email' });
        continue;
      }

      let normalizedPhone = '';
      if (rawPhone) {
        const phoneCheck = validatePhone(rawPhone);
        if (!phoneCheck.valid) {
          errors.push({ row, reason: phoneCheck.error });
          continue;
        }
        normalizedPhone = phoneCheck.normalized;
      } else {
        // Generate placeholder for email-only contacts
        normalizedPhone = `EMAIL_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      }

      // In-batch duplicate checks
      if (normalizedPhone && seenPhones.has(normalizedPhone)) {
        skipped += 1;
        continue;
      }
      if (email && seenEmails.has(email)) {
        skipped += 1;
        continue;
      }
      
      if (normalizedPhone) seenPhones.add(normalizedPhone);
      if (email) seenEmails.add(email);

      // DB duplicate checks
      if (normalizedPhone) {
        const existingPhone = await Contact.findOne({ phone: normalizedPhone });
        if (existingPhone) {
          skipped += 1;
          continue;
        }
      }
      
      if (email) {
        const existingEmail = await Contact.findOne({ email: email });
        if (existingEmail) {
          skipped += 1;
          continue;
        }
      }

      const customFields = {};
      if (college) customFields.College = college;
      if (department) customFields.Department = department;

      pendingContacts.push({ 
        name, 
        phone: normalizedPhone, 
        email, 
        tags, 
        source, 
        customFields,
        syncStatus: 'pending' 
      });
    }
  } finally {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (cleanupErr) {
      console.error('[ContactImport] Failed to delete temp file:', cleanupErr.message);
    }
  }

  const batchResults = pendingContacts.length > 0
    ? await processContactsInQueue(pendingContacts)
    : { imported: 0, synced: 0, failed: 0, pending: 0, errors: [] };

  res.json({
    message: 'Import completed',
    total: pendingContacts.length,
    imported: batchResults.imported,
    synced: batchResults.synced,
    failed: batchResults.failed,
    pending: batchResults.pending,
    skipped,
    errors: errors.length + batchResults.errors.length,
    errorDetails: [...errors.slice(0, 10), ...batchResults.errors.slice(0, 10)],
  });
};

// @desc    Bulk import contacts directly from JSON (Pasted Name/Email)
// @route   POST /api/contacts/bulk-import
const bulkImportContacts = async (req, res) => {
  const { contacts } = req.body;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ 
      success: false, 
      code: 'CONTACT_IMPORT_EMPTY',
      message: 'No contacts were provided.' 
    });
  }

  let imported = 0;
  let updated = 0;
  let invalid = 0;
  let duplicatesSkipped = 0;

  const validOperations = [];
  const processedEmails = new Set();

  for (const row of contacts) {
    const rawEmail = row.email ? row.email.toString().trim().toLowerCase() : '';
    const name = row.name ? row.name.toString().trim() : '';

    if (!rawEmail || !validator.isEmail(rawEmail)) {
      invalid++;
      continue;
    }

    if (processedEmails.has(rawEmail)) {
      duplicatesSkipped++;
      continue;
    }
    processedEmails.add(rawEmail);

    validOperations.push({
      updateOne: {
        filter: { email: rawEmail },
        update: {
          $set: {
            name: name || rawEmail.split('@')[0],
            email: rawEmail,
            source: 'Manual Import'
          },
          // We set phone to a placeholder if not present, because the schema previously required unique phone numbers or we just let it be empty since schema allows empty. Wait, the existing schema defaults phone to empty string but has an index on it. Let's not set a placeholder unless required.
        },
        upsert: true
      }
    });
  }

  if (validOperations.length === 0) {
    return res.status(400).json({ 
      success: false, 
      code: 'CONTACT_IMPORT_FAILED',
      message: 'No valid contacts found to import.' 
    });
  }

  try {
    const result = await Contact.bulkWrite(validOperations);
    imported = result.upsertedCount || 0;
    updated = result.modifiedCount || 0;
    
    // In bulkWrite, matchedCount includes both modified and unmodified matches. 
    // If a document matched but wasn't modified (e.g. data is exactly the same), 
    // it won't be in modifiedCount. So technically "updated" might be lower than actual matches.
    const matchedButNotModified = (result.matchedCount || 0) - (result.modifiedCount || 0);
    duplicatesSkipped += matchedButNotModified;

    res.json({
      success: true,
      message: 'Bulk import completed',
      total: contacts.length,
      imported,
      updated,
      duplicatesSkipped,
      invalid
    });
  } catch (error) {
    console.error('[BulkImport] Error:', error);
    res.status(500).json({ 
      success: false, 
      code: 'CONTACT_IMPORT_FAILED',
      message: 'Unable to import contacts: ' + error.message 
    });
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
