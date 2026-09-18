const User = require('../models/User');
const { encrypt } = require('../utils/crypto');
const axios = require('axios');

exports.connectBrevo = async (req, res) => {
  try {
    const { apiKey, senderEmail, senderName } = req.body;
    
    if (!apiKey || !senderEmail || !senderName) {
      return res.status(400).json({ message: 'API key, sender email, and sender name are required' });
    }

    // Verify the Brevo API key by making a test request
    try {
      const verifyRes = await axios.get('https://api.brevo.com/v3/account', {
        headers: { 'api-key': apiKey }
      });
      if (verifyRes.status !== 200) {
        throw new Error('Invalid API key');
      }
    } catch (err) {
      return res.status(401).json({ message: 'Invalid Brevo API Key' });
    }

    const encryptedKey = encrypt(apiKey);
    
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'brevo.connected': true,
        'brevo.apiKeyEncrypted': encryptedKey,
        'brevo.senderEmail': senderEmail,
        'brevo.senderName': senderName,
        'brevo.lastVerifiedAt': new Date(),
        'brevo.dailyLimit': 300,
        'brevo.emailsSentToday': 0,
        'brevo.usageDate': new Date().toISOString().split('T')[0]
      }
    });

    res.json({ message: 'Brevo connected successfully' });
  } catch (error) {
    console.error('Brevo connect error:', error);
    res.status(500).json({ message: 'Server error connecting to Brevo' });
  }
};

exports.getBrevoStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('brevo');
    if (!user || !user.brevo) {
      return res.json({ connected: false });
    }

    // Check if usageDate needs resetting
    const today = new Date().toISOString().split('T')[0];
    let emailsSentToday = user.brevo.emailsSentToday || 0;
    
    if (user.brevo.usageDate !== today) {
      emailsSentToday = 0; // It will be reset on next send, but we show 0 here
    }

    res.json({
      connected: user.brevo.connected,
      senderEmail: user.brevo.senderEmail,
      senderName: user.brevo.senderName,
      dailyLimit: user.brevo.dailyLimit,
      emailsSentToday,
      remaining: Math.max(0, (user.brevo.dailyLimit || 300) - emailsSentToday),
      lastVerifiedAt: user.brevo.lastVerifiedAt
    });
  } catch (error) {
    console.error('Brevo status error:', error);
    res.status(500).json({ message: 'Server error getting Brevo status' });
  }
};

exports.testBrevoConnection = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('brevo');
    if (!user || !user.brevo?.connected || !user.brevo.apiKeyEncrypted) {
      return res.status(400).json({ message: 'Brevo account is not connected.' });
    }

    const { decrypt } = require('../utils/crypto');
    const apiKey = decrypt(user.brevo.apiKeyEncrypted);

    if (!apiKey) {
      return res.status(401).json({ message: 'Invalid encrypted API key. Please reconnect.' });
    }

    const verifyRes = await axios.get('https://api.brevo.com/v3/account', {
      headers: { 'api-key': apiKey }
    });

    if (verifyRes.status === 200) {
      return res.json({ message: 'Brevo connection is working.' });
    } else {
      throw new Error('Unexpected response status');
    }
  } catch (error) {
    console.error('Brevo test error:', error);
    res.status(401).json({ message: 'Unable to connect to Brevo. Please reconnect your account.' });
  }
};

exports.disconnectBrevo = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'brevo.connected': false,
        'brevo.apiKeyEncrypted': null,
        'brevo.senderEmail': null,
        'brevo.senderName': null
      }
    });
    res.json({ message: 'Brevo disconnected successfully' });
  } catch (error) {
    console.error('Brevo disconnect error:', error);
    res.status(500).json({ message: 'Server error disconnecting Brevo' });
  }
};
