const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, unique: true, default: 'global' },
    senders: [
      {
        name: { type: String, required: true },
        email: { type: String, required: true },
        isVerified: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
