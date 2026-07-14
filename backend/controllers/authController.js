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
  console.log('[Auth API] Register request received:', req.body.email);
  const { firstName, lastName, companyName, email, phone, password } = req.body;

  if (!firstName || !lastName || !companyName || !email || !phone || !password) {
    console.log('[Auth API] Register failed: Missing required fields');
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  // Check for duplicate email
  const userExists = await User.findOne({ email: email.toLowerCase().trim() });
  if (userExists) {
    console.log('[Auth API] Register failed: Duplicate email:', email);
    return res.status(400).json({ message: 'User already exists with this email' });
  }

  // Check for duplicate phone
  const phoneExists = await User.findOne({ phone: phone.trim() });
  if (phoneExists) {
    console.log('[Auth API] Register failed: Duplicate phone:', phone);
    return res.status(400).json({ message: 'User already exists with this phone number' });
  }

  console.log('[Auth API] Saving new user to MongoDB...');
  const user = await User.create({
    firstName,
    lastName,
    companyName,
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    password, // Mongoose pre-save hook handles bcrypt hashing
    lastLogin: new Date(),
  });

  if (user) {
    console.log('[Auth API] User created successfully. Generating JWT...');
    res.status(201).json({
      success: true,
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      token: generateToken(user),
    });
  } else {
    console.log('[Auth API] Register failed: Invalid user data during creation');
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
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    token: generateToken(user),
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
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    companyName: user.companyName,
    role: user.role,
    avatar: user.avatar,
  });
};

module.exports = { register, login, getMe, logout, updateProfile };
