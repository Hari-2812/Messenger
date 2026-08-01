const Settings = require('../models/Settings');

// Initialize settings if they don't exist
const getGlobalSettings = async () => {
  let settings = await Settings.findOne({ type: 'global' });
  if (!settings) {
    settings = await Settings.create({
      type: 'global',
      senders: [],
    });
  }
  
  // Inject the environment variable sender as the verified sender
  const envSenderName = process.env.BREVO_SENDER_NAME;
  const envSenderEmail = process.env.BREVO_SENDER_EMAIL;
  
  const envSender = (envSenderName && envSenderEmail) ? {
    name: envSenderName,
    email: envSenderEmail,
    verified: true
  } : null;

  return { settings, envSender };
};

exports.getSettings = async (req, res) => {
  try {
    const { settings, envSender } = await getGlobalSettings();
    
    // We only use the environment sender now
    const senders = envSender ? [envSender] : [];
    
    res.json({ 
      success: true, 
      settings: {
        ...settings.toObject(),
        senders
      }
    });
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
