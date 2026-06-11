const express = require('express');
const { getMetaTemplates } = require('../controllers/metaController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/meta/templates - Fetch approved templates from Meta Business Account
router.get('/templates', getMetaTemplates);

module.exports = router;
