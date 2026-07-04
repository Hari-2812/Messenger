const express = require('express');
const {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/templateController');
const { syncTemplates } = require('../controllers/watiController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/sync/wati', authorize('admin', 'manager'), syncTemplates);
router.get('/sync/wati/', authorize('admin', 'manager'), syncTemplates);

router.route('/').get(getTemplates).post(createTemplate);
router.route('/:id').put(updateTemplate).delete(deleteTemplate);

module.exports = router;
