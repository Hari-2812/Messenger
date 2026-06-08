const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const MessageLog = require('../models/MessageLog');
const ProviderFactory = require('../services/ProviderFactory');
const campaignQueue = require('../services/campaignQueue');

const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate('templateId', 'title message')
      .sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCampaign = async (req, res) => {
  try {
    const { campaignName, templateId, contactIds, send } = req.body;

    if (!campaignName || !templateId || !contactIds || contactIds.length === 0) {
      return res.status(400).json({
        message: 'Campaign name, template, and at least one contact are required',
      });
    }

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const contacts = await Contact.find({ _id: { $in: contactIds } });
    if (contacts.length === 0) {
      return res.status(400).json({ message: 'No valid contacts found' });
    }

    const campaign = await Campaign.create({
      campaignName,
      templateId,
      contactIds: contacts.map((c) => c._id),
      totalContacts: contacts.length,
      status: send ? 'sending' : 'draft',
    });

    if (send) {
      await processCampaign(campaign, template, contacts);
      const updated = await Campaign.findById(campaign._id).populate('templateId', 'title message');
      return res.status(201).json(updated);
    }

    const populated = await Campaign.findById(campaign._id).populate('templateId', 'title message');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const processCampaign = async (campaign, template, contacts) => {
  await campaignQueue.processCampaignWithQueue(campaign, template, contacts);
};

// Preview messages without sending
const previewCampaign = async (req, res) => {
  try {
    const { templateId, contactIds } = req.body;

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const contacts = await Contact.find({ _id: { $in: contactIds } });

    const previews = contacts.map((contact) => ({
      contactId: contact._id,
      name: contact.name,
      phone: contact.phone,
      message: ProviderFactory.replaceVariables(template.message, contact),
    }));

    res.json(previews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send existing draft campaign
const sendCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status === 'completed' || campaign.status === 'sending') {
      return res.status(400).json({ message: 'Campaign already sent or in progress' });
    }

    const template = await Template.findById(campaign.templateId);
    const contacts = await Contact.find({ _id: { $in: campaign.contactIds } });

    campaign.status = 'sending';
    await campaign.save();

    await processCampaign(campaign, template, contacts);

    const updated = await Campaign.findById(campaign._id).populate('templateId', 'title message');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCampaigns,
  createCampaign,
  previewCampaign,
  sendCampaign,
};
