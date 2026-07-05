const express = require('express');
const {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
  syncAllContacts,
  retrySyncContact,
} = require('../controllers/contactController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.route('/').get(getContacts).post(createContact);
router.route('/import').post(upload.single('file'), importContacts);
router.route('/sync-all').post(syncAllContacts);
router.route('/:id/sync-retry').post(retrySyncContact);
router.route('/:id').put(updateContact).delete(deleteContact);

module.exports = router;
