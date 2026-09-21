require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function fixAdminRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const result1 = await User.updateOne(
      { _id: '6aaa4e816f7024052f2ce860' },
      { $set: { role: 'admin' } }
    );
    
    console.log('Update result for 6aaa4e816f7024052f2ce860:', result1);
    
    const user = await User.findById('6aaa4e816f7024052f2ce860', 'email role');
    console.log('Updated user:', user);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

fixAdminRoles();
