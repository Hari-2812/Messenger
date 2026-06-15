const validator = require('validator');
const Contact = require('../models/Contact');
const csv = require('csv-parser');
const fs = require('fs');

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
  const { name, phone, email } = req.body;

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
  });

  res.status(201).json(contact);
};

// @desc    Update contact
// @route   PUT /api/contacts/:id
const updateContact = async (req, res) => {
  const { name, phone, email } = req.body;
  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }

  // Phone validation if being changed
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

  await contact.save();
  res.json(contact);
};

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
const deleteContact = async (req, res) => {
  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }

  await contact.deleteOne();
  res.json({ message: 'Contact deleted successfully' });
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
  let imported = 0;
  let skipped = 0;

  try {
    // Parse CSV
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
        skipped++;
        continue;
      }

      try {
        await Contact.create({ name, phone: phoneCheck.normalized, email });
        imported++;
      } catch (err) {
        if (err.code === 11000) {
          skipped++;
        } else {
          errors.push({ row, reason: err.message });
        }
      }
    }
  } finally {
    // Always clean up temp file
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (cleanupErr) {
      console.error('[ContactImport] Failed to delete temp file:', cleanupErr.message);
    }
  }

  res.json({
    message: 'Import completed',
    imported,
    skipped,
    errors: errors.length,
    errorDetails: errors.slice(0, 10),
  });
};

module.exports = {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
};
