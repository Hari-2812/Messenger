const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (req, res) => {
  console.log('==================================================');
  console.log('[DEBUG] Route reached: POST /api/auth/register');
  console.log(`[DEBUG] Request received for email: ${req.body?.email}`);
  
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    console.log('[DEBUG] Validation result: FAILED (Missing required fields)');
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  if (!emailRegex.test(email)) {
    console.log('[DEBUG] Validation result: FAILED (Invalid email format)');
    return res.status(400).json({ message: 'Invalid email address' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    console.log('[DEBUG] Validation result: FAILED (Weak password)');
    return res.status(400).json({ message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character' });
  }

  console.log('[DEBUG] Validation result: PASSED');

  // Check for duplicate email
  const userExists = await User.findOne({ email: email.toLowerCase().trim() });
  if (userExists) {
    console.log('[DEBUG] MongoDB check: FAILED (Duplicate email)');
    return res.status(409).json({ message: 'This email is already registered. Please log in instead.' });
  }

  console.log('[DEBUG] MongoDB save: STARTING');
  let user;
  try {
    user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      password, // Mongoose pre-save hook handles bcrypt hashing
      lastLogin: new Date(),
    });
    console.log('[DEBUG] MongoDB save: SUCCESS');
  } catch (err) {
    console.log('[DEBUG] MongoDB save: FAILED (Error:', err.message, ')');
    return res.status(500).json({ message: 'Database error during user creation' });
  }

  if (user) {
    console.log('[DEBUG] JWT generation: STARTING');
    let token;
    try {
      token = generateToken(user);
      console.log('[DEBUG] JWT generation: SUCCESS');
    } catch (err) {
      console.log('[DEBUG] JWT generation: FAILED (Error:', err.message, ')');
      return res.status(500).json({ message: 'Error generating authentication token' });
    }

    const responsePayload = {
      success: true,
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      }
    };
    console.log('[DEBUG] Response payload:', JSON.stringify(responsePayload, null, 2));
    res.status(201).json(responsePayload);
    console.log('==================================================');
  } else {
    console.log('[DEBUG] MongoDB save: FAILED (Invalid user data during creation)');
    res.status(400).json({ message: 'Invalid user data' });
  }
};

const login = async (req, res) => {
  console.log('[Auth API] Login request received:', req.body.email);
  const { email, password } = req.body;

  if (!email || !password) {
    console.log('[Auth API] Login failed: Missing email or password');
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await user.matchPassword(password))) {
    console.log('[Auth API] Login failed: Invalid email or password');
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (user.status !== 'active') {
    console.log('[Auth API] Login failed: Account disabled for', email);
    return res.status(403).json({ message: 'Your account is disabled. Please contact support.' });
  }

  console.log('[Auth API] Login successful. Updating lastLogin...');
  user.lastLogin = new Date();
  await user.save();

  res.json({
    success: true,
    message: 'Login successful',
    token: generateToken(user),
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    }
  });
};

const getMe = async (req, res) => {
  console.log('[Auth API] Get Current User request received for ID:', req.user.id);
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    console.log('[Auth API] GetMe failed: User not found in MongoDB');
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ success: true, user });
};

const logout = async (req, res) => {
  console.log('[Auth API] Logout request received');
  res.json({ success: true, message: 'Logged out successfully' });
};

const updateProfile = async (req, res) => {
  console.log('[Auth API] Update Profile request received for ID:', req.user.id);
  const { firstName, lastName, companyName, phone } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    console.log('[Auth API] UpdateProfile failed: User not found');
    return res.status(404).json({ message: 'User not found' });
  }

  if (phone && phone !== user.phone) {
    const phoneExists = await User.findOne({ phone: phone.trim() });
    if (phoneExists) {
      console.log('[Auth API] UpdateProfile failed: Duplicate phone:', phone);
      return res.status(400).json({ message: 'Phone number already in use' });
    }
  }

  user.firstName = firstName || user.firstName;
  user.lastName = lastName || user.lastName;
  user.companyName = companyName || user.companyName;
  user.phone = phone || user.phone;

  console.log('[Auth API] Saving updated profile to MongoDB...');
  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      companyName: user.companyName,
      role: user.role,
      avatar: user.avatar,
    }
  });
};

const crypto = require('crypto');

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Please provide an email address' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Optional: Attempt to send via brevo if configured, otherwise just log or return success
  // For security, do NOT return the raw token in the API response in production.
  // The token will be printed securely by our CLI script or sent via email.
  
  res.status(200).json({ 
    success: true, 
    message: 'Reset token generated successfully. Please check your email or run the Admin CLI script to retrieve it.'
  });
};

const resetPassword = async (req, res) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  if (!req.body.password) {
    return res.status(400).json({ message: 'Please provide a new password' });
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful. Please log in.',
  });
};

module.exports = { register, login, getMe, logout, updateProfile, forgotPassword, resetPassword };
