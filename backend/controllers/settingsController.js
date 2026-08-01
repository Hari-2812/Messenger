const Settings = require('../models/Settings');

// Initialize settings if they don't exist
const getGlobalSettings = async () => {
  let settings = await Settings.findOne({ type: 'global' });
  if (!settings) {
    settings = await Settings.create({
      type: 'global',
      senders: [
        {
          name: process.env.BREVO_SENDER_NAME || 'Default Sender',
          email: process.env.BREVO_SENDER_EMAIL || 'sender@example.com',
        },
      ],
    });
  }
  return settings;
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addSender = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email required' });
    
    const settings = await getGlobalSettings();
    settings.senders.push({ name, email });
    await settings.save();
    
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeSender = async (req, res) => {
  try {
    const { email } = req.params;
    const settings = await getGlobalSettings();
    
    settings.senders = settings.senders.filter(s => s.email !== email);
    await settings.save();
    
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
