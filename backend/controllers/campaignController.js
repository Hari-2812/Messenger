const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const MessageLog = require('../models/MessageLog');
const ProviderFactory = require('../services/ProviderFactory');
const campaignQueue = require('../services/campaignQueue');

// @desc    Get all campaigns (paginated)
// @route   GET /api/campaigns
const getCampaigns = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [campaigns, total] = await Promise.all([
    Campaign.find()
      .populate('templateId', 'title source')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Campaign.countDocuments(),
  ]);

  res.json({ campaigns, total, page, pages: Math.ceil(total / limit) });
};

// @desc    Create a new campaign
// @route   POST /api/campaigns
const createCampaign = async (req, res) => {
  const { campaignName, templateId, metaTemplateName, metaTemplateLanguage, contactIds, send } = req.body;

  if (!campaignName || !metaTemplateName || !contactIds || contactIds.length === 0) {
    return res.status(400).json({
      message: 'Campaign name, a Meta template name, and at least one contact are required',
    });
  }

  // Validate local template if provided (optional reference)
  let template = null;
  if (templateId) {
    template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
  }

  const contacts = await Contact.find({ _id: { $in: contactIds } });
  if (contacts.length === 0) {
    return res.status(400).json({ message: 'No valid contacts found for the provided IDs' });
  }

  const campaign = await Campaign.create({
    campaignName,
    templateId: templateId || null,
    metaTemplateName,
    metaTemplateLanguage: metaTemplateLanguage || 'en_US',
    contactIds: contacts.map((c) => c._id),
    totalContacts: contacts.length,
    provider: ProviderFactory.getProvider(),
    createdBy: req.user?._id || null,
    status: send ? 'sending' : 'draft',
  });

  const populated = await Campaign.findById(campaign._id).populate('templateId', 'title source');

  if (send) {
    // Respond immediately — send in background
    res.status(202).json({
      ...populated.toObject(),
      _queued: true,
      message: 'Campaign queued for sending',
    });

    // Fire and forget — background processing
    const io = req.app.get('io');
    setImmediate(() =>
      campaignQueue.processCampaignWithQueue(campaign, template, contacts, io).catch((err) =>
        console.error(`[Campaign] Background send error: ${err.message}`)
      )
    );
    return;
  }

  res.status(201).json(populated);
};

// @desc    Preview campaign messages without sending
// @route   POST /api/campaigns/preview
const previewCampaign = async (req, res) => {
  const { metaTemplateName, contactIds } = req.body;

  if (!metaTemplateName || !contactIds || contactIds.length === 0) {
    return res.status(400).json({ message: 'metaTemplateName and contactIds are required' });
  }

  const contacts = await Contact.find({ _id: { $in: contactIds } });

  const previews = contacts.map((contact) => ({
    contactId: contact._id,
    name: contact.name,
    phone: contact.phone,
    message: `📨 Meta template "${metaTemplateName}" will be sent to this contact`,
  }));

  res.json(previews);
};

// @desc    Send an existing draft campaign
// @route   POST /api/campaigns/:id/send
const sendCampaign = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return res.status(404).json({ message: 'Campaign not found' });
  }

  if (campaign.status === 'completed' || campaign.status === 'sending' || campaign.status === 'partial') {
    return res.status(400).json({ message: `Campaign cannot be sent — current status: ${campaign.status}` });
  }

  if (!campaign.metaTemplateName) {
    return res.status(400).json({ message: 'Campaign has no Meta template configured' });
  }

  const template = campaign.templateId ? await Template.findById(campaign.templateId) : null;
  const contacts = await Contact.find({ _id: { $in: campaign.contactIds } });

  if (contacts.length === 0) {
    return res.status(400).json({ message: 'No valid contacts found for this campaign' });
  }

  campaign.status = 'sending';
  await campaign.save();

  // Respond immediately — process in background
  res.status(202).json({
    ...campaign.toObject(),
    _queued: true,
    message: 'Campaign queued for sending',
  });

  const io = req.app.get('io');
  setImmediate(() =>
    campaignQueue.processCampaignWithQueue(campaign, template, contacts, io).catch((err) =>
      console.error(`[Campaign] Background send error: ${err.message}`)
    )
  );
};

// @desc    Get single campaign with latest stats
// @route   GET /api/campaigns/:id
const getCampaignById = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).populate('templateId', 'title source');
  if (!campaign) {
    return res.status(404).json({ message: 'Campaign not found' });
  }
  res.json(campaign);
};

module.exports = {
  getCampaigns,
  createCampaign,
  previewCampaign,
  sendCampaign,
  getCampaignById,
};
