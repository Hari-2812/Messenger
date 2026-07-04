const express = require('express');
const { getConversations, getConversation, sendReply } = require('../controllers/inboxController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', getConversations);
router.get('/:id', getConversation);
router.post('/:id/reply', sendReply);

module.exports = router;
