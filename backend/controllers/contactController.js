const Contact = require('../models/Contact');
const csv = require('csv-parser');
const fs = require('fs');

// @desc    Get all contacts
// @route   GET /api/contacts
const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create contact
// @route   POST /api/contacts
const createContact = async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    const existing = await Contact.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: 'Contact with this phone already exists' });
    }

    const contact = await Contact.create({ name, phone, email: email || '' });
    res.status(201).json(contact);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Contact with this phone already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update contact
// @route   PUT /api/contacts/:id
const updateContact = async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (phone && phone !== contact.phone) {
      const existing = await Contact.findOne({ phone });
      if (existing) {
        return res.status(400).json({ message: 'Contact with this phone already exists' });
      }
    }

    contact.name = name || contact.name;
    contact.phone = phone || contact.phone;
    contact.email = email !== undefined ? email : contact.email;

    await contact.save();
    res.json(contact);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Contact with this phone already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    await contact.deleteOne();
    res.json({ message: 'Contact deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Import contacts from CSV
// @route   POST /api/contacts/import
const importContacts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV file' });
    }

    const results = [];
    const errors = [];
    let imported = 0;
    let skipped = 0;

    const parseCSV = () =>
      new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => results.push(row))
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });

    await parseCSV();

    for (const row of results) {
      const name = row.Name || row.name || '';
      const phone = row.Phone || row.phone || '';
      const email = row.Email || row.email || '';

      if (!name || !phone) {
        errors.push({ row, reason: 'Missing name or phone' });
        continue;
      }

      const existing = await Contact.findOne({ phone });
      if (existing) {
        skipped++;
        continue;
      }

      try {
        await Contact.create({ name, phone, email });
        imported++;
      } catch (err) {
        if (err.code === 11000) {
          skipped++;
        } else {
          errors.push({ row, reason: err.message });
        }
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Import completed',
      imported,
      skipped,
      errors: errors.length,
      errorDetails: errors.slice(0, 10),
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
};
