require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function generateResetToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Accept email from CLI arguments or default to admin
    const email = process.argv[2] || 'admin@campaign.com';
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }
    
    const token = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    
    console.log(`\n--- PASSWORD RESET TOKEN ---`);
    console.log(`User: ${user.email}`);
    console.log(`Token: ${token}`);
    console.log(`\nTo reset the password, use a PUT request to:`);
    console.log(`PUT /api/auth/resetpassword/${token}`);
    console.log(`Body: { "password": "NEW_SECURE_PASSWORD" }`);
    console.log(`----------------------------\n`);
    
  } catch (error) {
    console.error('Failed to generate token:', error);
  } finally {
    process.exit(0);
  }
}

generateResetToken();
