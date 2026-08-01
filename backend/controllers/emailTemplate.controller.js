const EmailTemplate = require('../models/EmailTemplate');

// @desc    Get all email templates
// @route   GET /api/email-templates
const getTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.find().sort({ createdAt: -1 }).populate('createdBy', 'name email');
    res.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single email template
// @route   GET /api/email-templates/:id
const getTemplateById = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create email template
// @route   POST /api/email-templates
const createTemplate = async (req, res) => {
  try {
    const { name, subject, htmlContent } = req.body;

    if (!name || !subject || !htmlContent) {
      return res.status(400).json({ message: 'Name, subject, and HTML content are required' });
    }

    const template = await EmailTemplate.create({
      name,
      subject,
      htmlContent,
      createdBy: req.user?._id, // Assuming auth middleware attaches req.user
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update email template
// @route   PUT /api/email-templates/:id
const updateTemplate = async (req, res) => {
  try {
    const { name, subject, htmlContent } = req.body;

    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.name = name || template.name;
    template.subject = subject || template.subject;
    template.htmlContent = htmlContent || template.htmlContent;

    await template.save();
    res.json(template);
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete email template
// @route   DELETE /api/email-templates/:id
const deleteTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await EmailTemplate.deleteOne({ _id: req.params.id });
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
