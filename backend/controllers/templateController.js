const Template = require('../models/Template');

// @desc    Get templates (local CRM templates only, or all by source)
// @route   GET /api/templates?source=local|all
const getTemplates = async (req, res) => {
  const source = req.query.source || 'local';
  const filter = source === 'all' ? {} : { source };

  const templates = await Template.find(filter).sort({ createdAt: -1 });
  res.json(templates);
};

// @desc    Create local CRM template
// @route   POST /api/templates
const createTemplate = async (req, res) => {
  const { title, message } = req.body;

  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ message: 'Title and message are required' });
  }

  const template = await Template.create({
    title: title.trim(),
    message: message.trim(),
    source: 'local', // Always 'local' when created via CRM
  });

  res.status(201).json(template);
};

// @desc    Update local CRM template
// @route   PUT /api/templates/:id
const updateTemplate = async (req, res) => {
  const template = await Template.findById(req.params.id);

  if (!template) {
    return res.status(404).json({ message: 'Template not found' });
  }

  if (template.source !== 'local') {
    return res.status(400).json({
      message: 'WATI-synced templates cannot be edited here. Edit them in WATI or create a local CRM template instead.',
    });
  }

  template.title = req.body.title?.trim() || template.title;
  template.message = req.body.message?.trim() || template.message;

  await template.save();
  res.json(template);
};

// @desc    Delete local CRM template
// @route   DELETE /api/templates/:id
const deleteTemplate = async (req, res) => {
  const template = await Template.findById(req.params.id);

  if (!template) {
    return res.status(404).json({ message: 'Template not found' });
  }

  if (template.source !== 'local') {
    return res.status(400).json({
      message: 'WATI-synced templates cannot be deleted here. Manage them in WATI.',
    });
  }

  await template.deleteOne();
  res.json({ message: 'Template deleted successfully' });
};

module.exports = { getTemplates, createTemplate, updateTemplate, deleteTemplate };
