const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', settingsController.getSettings);
router.post('/senders', settingsController.addSender);
router.delete('/senders/:email', settingsController.removeSender);

module.exports = router;
