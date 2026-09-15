const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.BREVO_ENCRYPTION_KEY || 'default-secret-key-32-chars-long!'; // Must be 32 bytes
const IV_LENGTH = 16;

// Ensure key is 32 bytes exactly
const getValidKey = () => {
  if (ENCRYPTION_KEY.length >= 32) {
    return Buffer.from(ENCRYPTION_KEY.slice(0, 32));
  }
  return Buffer.concat([Buffer.from(ENCRYPTION_KEY), Buffer.alloc(32)], 32);
};

exports.encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getValidKey(), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

exports.decrypt = (text) => {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getValidKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
};
