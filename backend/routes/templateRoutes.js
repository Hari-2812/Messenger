const express = require('express');
const {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/templateController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/').get(getTemplates).post(createTemplate);
router.route('/:id').put(updateTemplate).delete(deleteTemplate);

module.exports = router;
