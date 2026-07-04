const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'agent'], default: 'admin' },
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
