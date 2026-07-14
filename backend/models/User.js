const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    companyName: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'agent', 'user'], default: 'admin' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    avatar: { type: String },
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

module.exports = mongoose.model('User', userSchema);
