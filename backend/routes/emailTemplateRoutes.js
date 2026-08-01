const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate
} = require('../controllers/emailTemplate.controller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Require auth for all template routes

router.route('/')
  .get(getTemplates)
  .post(createTemplate);

router.route('/:id')
  .get(getTemplateById)
  .put(updateTemplate)
  .delete(deleteTemplate);

module.exports = router;
