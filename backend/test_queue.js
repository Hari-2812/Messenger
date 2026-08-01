require('dotenv').config();
const mongoose = require('mongoose');
const { processEmailQueue } = require('./services/emailQueue.service');

async function testQueue() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB.');

    console.log('Running processEmailQueue()...');
    await processEmailQueue();
    console.log('Queue processing completed.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testQueue();
