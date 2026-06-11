const express = require('express');
const { getMetaTemplates, getAllMetaTemplates } = require('../controllers/metaController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/meta/templates      — APPROVED only (Campaign creation dropdown)
router.get('/templates', getMetaTemplates);

// GET /api/meta/templates/all  — All statuses (Templates page status dashboard)
router.get('/templates/all', getAllMetaTemplates);

module.exports = router;
