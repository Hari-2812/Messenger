require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('./models/Contact');

async function checkContacts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await Contact.countDocuments();
    const activeCount = await Contact.countDocuments({ isDeleted: { $ne: true } });
    console.log(`Total Contacts: ${count}, Active: ${activeCount}`);

    const latest = await Contact.find().sort({ createdAt: -1 }).limit(5);
    console.log('Latest 5 Contacts:', JSON.stringify(latest, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}
checkContacts();
