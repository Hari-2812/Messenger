require('dotenv').config();

async function testLogin() {
  try {
    const { login } = require('./controllers/authController');
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);

    const req = {
      body: { email: 'admin@campaign.com', password: 'Admin@123' }
    };

    const res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log('Status:', this.statusCode || 200);
        console.log('Response:', data);
      }
    };

    await login(req, res);
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testLogin();
