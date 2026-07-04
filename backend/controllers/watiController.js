const Template = require('../models/Template');
const watiService = require('../services/watiService');
const { getWatiConfig } = require('../config/wati');

const getSettings = async (req, res) => {
  const config = getWatiConfig();
  res.json({
    provider: process.env.WHATSAPP_PROVIDER || 'meta',
    endpointConfigured: Boolean(config.baseUrl),
    businessNumber: config.businessNumber,
    webhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/wati`,
    webhookVerifyTokenConfigured: Boolean(config.webhookVerifyToken),
    webhookSecretConfigured: Boolean(config.webhookSecret),
    accessTokenConfigured: Boolean(config.accessToken),
  });
};

const syncTemplates = async (req, res) => {
  const includeAll = req.query.all === 'true';
  const { templates, total } = await watiService.getApprovedTemplates({ includeAll });

  await Promise.all(
    templates.map((tpl) =>
      Template.findOneAndUpdate(
        { source: 'wati', metaName: tpl.name, metaLanguage: tpl.language },
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
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );

  res.json({ templates, total });
};

module.exports = { getSettings, syncTemplates };
