const express = require('express');
const {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  bulkDeleteContacts,
  importContacts,
  bulkImportContacts,
  syncAllContacts,
  retrySyncContact,
} = require('../controllers/contactController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

// Static routes first — must precede /:id to avoid conflicts
router.post('/bulk-delete', bulkDeleteContacts);
router.delete('/bulk-delete', bulkDeleteContacts);
router.get('/', getContacts);
router.post('/', createContact);
router.post('/import', upload.single('file'), importContacts);
router.post('/bulk-import', bulkImportContacts);
router.post('/sync-all', protect, syncAllContacts);
router.post('/:id/sync-retry', protect, retrySyncContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

module.exports = router;
