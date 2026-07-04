const express = require('express');
const { getRules, createRule, updateRule } = require('../controllers/automationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.use(authorize('admin', 'manager'));

router.route('/').get(getRules).post(createRule);
router.put('/:id', updateRule);

module.exports = router;
