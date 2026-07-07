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
    ? { $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }] }
    : {};

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
      await watiService.deleteContact(contact.phone);
    } catch (err) {
      console.warn(`[WATI] Failed to delete contact from WATI: ${err.message}`);
    }
  }

  await contact.deleteOne();
  res.json({ message: 'Contact deleted successfully' });
};

// @desc    Bulk delete contacts
// @route   POST /api/contacts/bulk-delete
const bulkDeleteContacts = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'No contact IDs provided' });
  }

  const contacts = await Contact.find({ _id: { $in: ids } });
  
  if (contacts.length === 0) {
    return res.status(404).json({ message: 'No valid contacts found' });
  }

  let deletedCount = 0;
  
  for (const contact of contacts) {
    if (ProviderFactory.getProvider() === 'wati') {
      try {
        await watiService.deleteContact(contact.phone);
      } catch (err) {
        console.warn(`[WATI] Failed to delete contact ${contact.phone} from WATI: ${err.message}`);
      }
    }
    await contact.deleteOne();
    deletedCount++;
  }

  res.json({ message: `Successfully deleted ${deletedCount} contacts` });
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
    return res.status(400).json({ message: 'Please upload a CSV file' });
  }

  const filePath = req.file.path;
  const results = [];
  const errors = [];
  const pendingContacts = [];
  let skipped = 0;

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    for (const row of results) {
      const name = (row.Name || row.name || '').trim();
      const rawPhone = (row.Phone || row.phone || '').trim();
      const email = (row.Email || row.email || '').trim();
      const tags = (row.Tags || row.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
      const source = (row.Source || row.source || 'CSV').trim();

      if (!name || !rawPhone) {
        errors.push({ row, reason: 'Missing name or phone' });
        continue;
      }

      const phoneCheck = validatePhone(rawPhone);
      if (!phoneCheck.valid) {
        errors.push({ row, reason: phoneCheck.error });
        continue;
      }

      const existing = await Contact.findOne({ phone: phoneCheck.normalized });
      if (existing) {
        skipped += 1;
        continue;
      }

      pendingContacts.push({ name, phone: phoneCheck.normalized, email, tags, source, syncStatus: 'pending' });
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

module.exports = {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  bulkDeleteContacts,
  importContacts,
  syncAllContacts,
  retrySyncContact,
};
