const Contact = require('../models/Contact');
const ProviderFactory = require('./ProviderFactory');
const watiService = require('./watiService');

const isWatiEnabled = () => ProviderFactory.getProvider() === 'wati';

const extractWatiContactId = (result, contact) =>
  result?.watiContactId ||
  result?.raw?.contact?.id ||
  result?.raw?.id ||
  contact.watiContactId ||
  null;

const applySyncSuccess = async (contact, result) => {
  contact.syncStatus = 'synced';
  contact.whatsappStatus = 'synced';
  contact.lastSyncedAt = new Date();
  contact.syncError = null;
  const watiId = extractWatiContactId(result, contact);
  if (watiId) contact.watiContactId = watiId;
  await contact.save();
  return contact;
};

const applySyncFailure = async (contact, error) => {
  contact.syncStatus = 'failed';
  contact.whatsappStatus = 'failed';
  contact.syncError = error?.message || String(error);
  await contact.save();
  return contact;
};

/**
 * Sync a single contact to WATI (create or update).
 * @param {import('../models/Contact')} contact - Mongoose contact document
 * @returns {Promise<{ success: boolean, contact, syncStatus: string, error?: string, skipped?: boolean }>}
 */
const syncSingleContact = async (contact) => {
  if (!isWatiEnabled()) {
    return { success: true, contact, syncStatus: contact.syncStatus, skipped: true };
  }

  try {
    let result;
    if (contact.watiContactId || contact.syncStatus === 'synced') {
      result = await watiService.updateContact(contact.phone, contact);
      await applySyncSuccess(contact, { watiContactId: contact.watiContactId, raw: result });
    } else {
      result = await watiService.syncContact(contact);
      await applySyncSuccess(contact, result);
    }

    return {
      success: true,
      contact,
      syncStatus: 'synced',
      message: 'Contact synced with WATI',
    };
  } catch (error) {
    await applySyncFailure(contact, error);
    console.warn(`[ContactSync] Failed for ${contact._id} (${contact.phone}): ${error.message}`);
    return {
      success: false,
      contact,
      syncStatus: 'failed',
      error: error.message,
    };
  }
};

/**
 * Sync an array of contact documents in batches.
 * @param {Array} contacts
 * @param {number} batchSize
 */
const syncBulkContacts = async (contacts, batchSize = 25) => {
  const results = {
    total: contacts.length,
    synced: 0,
    failed: 0,
    pending: 0,
    errors: [],
  };

  if (!isWatiEnabled() || contacts.length === 0) {
    results.pending = contacts.length;
    return results;
  }

  for (let index = 0; index < contacts.length; index += batchSize) {
    const batch = contacts.slice(index, index + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((contact) => syncSingleContact(contact))
    );

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.success && !result.value.skipped) {
          results.synced += 1;
        } else if (!result.value.success) {
          results.failed += 1;
          if (result.value.error) results.errors.push(result.value.error);
        }
      } else {
        results.failed += 1;
        results.errors.push(result.reason?.message || 'Unknown sync failure');
      }
    });
  }

  results.pending = Math.max(0, results.total - results.synced - results.failed);
  return results;
};

const { getWatiConfig } = require('../config/wati');

/**
 * Find and sync all pending/failed contacts.
 */
const syncAllContacts = async () => {
  const { accessToken, baseUrl } = getWatiConfig();
  if (!accessToken || !baseUrl) {
    throw new Error('WATI not configured');
  }

  const contacts = await Contact.find({
    $or: [{ syncStatus: { $in: ['pending', 'failed'] } }, { watiContactId: null }],
  });

  return syncBulkContacts(contacts);
};

/**
 * Find and retry all pending/failed contacts.
 */
const retryFailedContacts = async () => {
  return syncAllContacts();
};

/**
 * Ensure a contact is synced before campaign send.
 * @param {string} contactId
 */
const ensureContactSynced = async (contactId) => {
  const contact = await Contact.findById(contactId);
  if (!contact) {
    throw new Error('Contact not found');
  }

  if (contact.syncStatus === 'synced' && contact.watiContactId) {
    return { success: true, contact, syncStatus: 'synced' };
  }

  return syncSingleContact(contact);
};

/**
 * Sync a contact by MongoDB ID.
 */
const syncContactById = async (contactId) => {
  const contact = await Contact.findById(contactId);
  if (!contact) {
    return { success: false, syncStatus: 'failed', error: 'Contact not found' };
  }
  return syncSingleContact(contact);
};

module.exports = {
  isWatiEnabled,
  syncSingleContact,
  syncBulkContacts,
  syncAllContacts,
  retryFailedContacts,
  ensureContactSynced,
  syncContactById,
};
