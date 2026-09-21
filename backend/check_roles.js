require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkRoles() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({}, 'firstName lastName email role');
  console.log(users);
  process.exit(0);
}
checkRoles();
