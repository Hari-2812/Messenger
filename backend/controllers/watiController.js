const Template = require('../models/Template');
const watiService = require('../services/watiService');
const { getWatiConfig } = require('../config/wati');

const getSettings = async (req, res) => {
  const config = getWatiConfig();
  res.json({
    provider: process.env.WHATSAPP_PROVIDER || 'wati',
    endpointConfigured: Boolean(config.baseUrl),
    businessNumber: config.businessNumber,
    webhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/wati`,
    webhookVerifyTokenConfigured: Boolean(config.webhookVerifyToken),
    webhookSecretConfigured: Boolean(config.webhookSecret),
    accessTokenConfigured: Boolean(config.accessToken),
  });
};

const syncTemplates = async (req, res) => {
  try {
    const includeAll = req.query.all === 'true';
    const { templates, total } = await watiService.getApprovedTemplates({ includeAll });

    await Promise.all(
      templates.map((tpl) =>
        Template.findOneAndUpdate(
          { source: 'wati', $or: [{ watiTemplateId: tpl.id }, { title: tpl.name }, { metaName: tpl.name }] },
          {
            title: tpl.name,
            message: tpl.bodyText || `[WATI Template: ${tpl.name}]`,
            source: 'wati',
            metaName: tpl.name,
            metaStatus: tpl.status,
            metaLanguage: tpl.language,
            metaCategory: tpl.category,
            watiTemplateId: tpl.id,
            watiStatus: tpl.status,
            watiRaw: tpl.raw,
            variableCount: tpl.paramCount,
            header: tpl.header || null,
            body: tpl.body || tpl.bodyText || null,
            footer: tpl.footer || null,
            buttons: tpl.buttons || [],
            variables: tpl.variables || [],
            category: tpl.category || null,
            language: tpl.language || null,
            templateStatus: tpl.status || null,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );

    res.json({ templates, total });
  } catch (error) {
    console.error('[WATI Sync] Failed:', error.message);
    res.status(503).json({
      success: false,
      message: error.message || 'Unable to sync templates from WATI right now',
    });
  }
};

module.exports = { getSettings, syncTemplates };
