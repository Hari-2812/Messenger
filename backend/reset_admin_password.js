require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function resetPassword() {
  try {
    const newPassword = process.env.NEW_ADMIN_PASSWORD;
    if (!newPassword) {
      console.error('Error: NEW_ADMIN_PASSWORD environment variable is required.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    
    const user = await User.findOne({ email: 'admin@campaign.com' });
    if (!user) {
      console.error('Error: Admin user not found.');
      process.exit(1);
    }

    if (!user.firstName) {
      user.firstName = 'Admin';
    }
    user.password = newPassword;
    await user.save(); // Triggers the pre-save hook for bcrypt hashing

    console.log('Success: Password has been reset securely.');
    
  } catch (error) {
    console.error('Failed to reset password:', error);
  } finally {
    process.exit(0);
  }
}

resetPassword();
