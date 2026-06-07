const express = require('express');
const { getLogs, getDashboardStats } = require('../controllers/logController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getLogs);
router.get('/dashboard', getDashboardStats);

module.exports = router;
