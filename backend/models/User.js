const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    companyName: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'agent', 'user'], default: 'user' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    avatar: { type: String },
    brevo: {
      connected: { type: Boolean, default: false },
      apiKeyEncrypted: { type: String },
      senderEmail: { type: String },
      senderName: { type: String },
      dailyLimit: { type: Number, default: 250 },
      emailsSentToday: { type: Number, default: 0 },
      usageDate: { type: String },
      lastVerifiedAt: { type: Date }
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  const isBcryptHash = typeof this.password === 'string' && /^\$2[aby]\$/.test(this.password);

  if (isBcryptHash) return next();
  if (!this.isModified('password')) this.markModified('password');

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
  const crypto = require('crypto');
  
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
