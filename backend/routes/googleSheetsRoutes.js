const express = require('express');
const router = express.Router();
const googleSheetsController = require('../controllers/googleSheetsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/connect', googleSheetsController.connectSheet);
router.post('/sync', googleSheetsController.syncContacts);
router.post('/sync-campaign-sheet', googleSheetsController.syncCampaignSheet);
router.get('/preview', googleSheetsController.previewColumns);

module.exports = router;
