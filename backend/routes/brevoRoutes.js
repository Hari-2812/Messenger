const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const brevoController = require('../controllers/brevo.controller');

router.post('/connect', protect, brevoController.connectBrevo);
router.get('/status', protect, brevoController.getBrevoStatus);
router.delete('/disconnect', protect, brevoController.disconnectBrevo);

module.exports = router;
