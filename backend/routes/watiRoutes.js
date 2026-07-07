const express = require('express');
const { getSettings, syncTemplates, testSend } = require('../controllers/watiController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.use(authorize('admin', 'manager'));

router.get('/settings', getSettings);
router.get('/templates', syncTemplates);
router.post('/test-send', testSend);

module.exports = router;
