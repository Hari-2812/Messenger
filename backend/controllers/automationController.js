const AutomationRule = require('../models/AutomationRule');

const getRules = async (req, res) => {
  const rules = await AutomationRule.find().sort({ createdAt: -1 });
  res.json(rules);
};

const createRule = async (req, res) => {
  const { name, trigger, conditions, actions, isActive } = req.body;
  if (!name?.trim() || !trigger) return res.status(400).json({ message: 'Name and trigger are required' });

  const rule = await AutomationRule.create({
    name: name.trim(),
    trigger,
    conditions: conditions || {},
    actions: actions || {},
    isActive: isActive !== false,
    createdBy: req.user?._id,
  });
  res.status(201).json(rule);
};

const updateRule = async (req, res) => {
  const rule = await AutomationRule.findById(req.params.id);
  if (!rule) return res.status(404).json({ message: 'Automation rule not found' });

  ['name', 'trigger', 'conditions', 'actions', 'isActive'].forEach((field) => {
    if (req.body[field] !== undefined) rule[field] = req.body[field];
  });
  await rule.save();
  res.json(rule);
};

module.exports = { getRules, createRule, updateRule };
