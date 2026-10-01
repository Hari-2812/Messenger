require('dotenv').config();
const { bulkImportContacts } = require('./controllers/contactController');
const mongoose = require('mongoose');

async function testImport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Simulate req and res
    const req = {
      user: { _id: '6a2910fa3b3ce86418becbdb' }, // Admin user ID from previous logs
      body: {
        contacts: [
          { name: 'Test Restore 1', email: 'testrestore1@example.com' },
          { name: 'Test Restore 2', email: 'testrestore2@example.com' }
        ]
      }
    };
    
    const res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log('Status:', this.statusCode || 200);
        console.log('Response:', JSON.stringify(data, null, 2));
      }
    };

    console.log('--- Initial Import ---');
    await bulkImportContacts(req, res);

    // Let's delete them to make them soft-deleted
    const Contact = require('./models/Contact');
    await Contact.updateMany(
      { email: { $in: ['testrestore1@example.com', 'testrestore2@example.com'] } },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    console.log('\n--- Soft Deleted Contacts ---');

    // Run import again to test restore
    console.log('\n--- Second Import (Restore) ---');
    await bulkImportContacts(req, res);
    
    // Verify they are not deleted
    const check = await Contact.find({ email: { $in: ['testrestore1@example.com', 'testrestore2@example.com'] } });
    console.log('\n--- DB Verification ---');
    check.forEach(c => console.log(`${c.email}: isDeleted=${c.isDeleted}`));

    // Cleanup
    await Contact.deleteMany({ email: { $in: ['testrestore1@example.com', 'testrestore2@example.com'] } });
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testImport();
