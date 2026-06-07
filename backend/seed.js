require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const seed = async () => {
  await connectDB();

  const existing = await User.findOne({ email: 'admin@campaign.com' });
  if (existing) {
    console.log('Default user already exists');
    console.log('Email: admin@campaign.com');
    console.log('Password: admin123');
    process.exit(0);
  }

  await User.create({
    name: 'Admin',
    email: 'admin@campaign.com',
    password: 'admin123',
  });

  console.log('Default user created:');
  console.log('Email: admin@campaign.com');
  console.log('Password: admin123');

  process.exit(0);
};

seed();
