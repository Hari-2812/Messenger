require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function fixAdminRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const result1 = await User.updateOne(
      { email: 'admin@campaign.com' },
      { $set: { role: 'admin' } }
    );
    
    const result2 = await User.updateOne(
      { email: 'newadmin@campaign.com' },
      { $set: { role: 'admin' } }
    );
    
    console.log('admin@campaign.com update result:', result1);
    console.log('newadmin@campaign.com update result:', result2);
    
    const users = await User.find({ email: { $in: ['admin@campaign.com', 'newadmin@campaign.com'] } }, 'email role');
    console.log('Updated users:', users);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

fixAdminRoles();
