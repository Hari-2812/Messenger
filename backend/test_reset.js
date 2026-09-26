require('dotenv').config();
const axios = require('axios');

async function testPasswordReset() {
  try {
    const token = '7537324cc71dad43de2e55605cf66551490e2d92';
    
    // We will test directly against the live backend because our code isn't deployed yet?
    // Wait, the code isn't deployed. I should test it by calling the controller directly or starting the server locally.
    
    console.log("Testing via controller directly...");
    const { resetPassword } = require('./controllers/authController');
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);

    const req = {
      params: { token },
      body: { password: 'Admin@123' } // setting it back to something for testing
    };

    const res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log('Status:', this.statusCode);
        console.log('Response:', data);
      }
    };

    await resetPassword(req, res);
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testPasswordReset();
