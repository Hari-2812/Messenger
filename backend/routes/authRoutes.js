const express = require('express');
const { register, login, getMe, logout, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/profile', protect, getMe); // same as /me for GET profile
router.put('/profile', protect, updateProfile);

module.exports = router;
