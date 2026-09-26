require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'admin@campaign.com' });
    if (!user) {
      console.log('User not found.');
      process.exit(1);
    }
    console.log('User found:', user.email);
    console.log('Role:', user.role);
    console.log('Password hash looks valid?', /^\$2[aby]\$/.test(user.password));
    
    // Check if it matches 'Admin@123'
    const match1 = await bcrypt.compare('Admin@123', user.password);
    console.log('Matches Admin@123?', match1);

    const match2 = await bcrypt.compare('SecureAdmin!2026', user.password);
    console.log('Matches SecureAdmin!2026?', match2);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
checkAdmin();
