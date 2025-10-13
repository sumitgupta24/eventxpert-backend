const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const User = require('../models/userModel');
const { uploadImage } = require('../config/cloudinary'); // Import uploadImage helper
const crypto = require('crypto'); // Import crypto for token generation
const sendEmail = require('../utils/sendEmail'); // Import sendEmail utility

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      gender: user.gender,
      rollNo: user.rollNo,
      department: user.department,
      societyName: user.societyName,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, profilePicture, gender, rollNo, department, societyName } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Logic to prevent direct admin signup
  if (role === 'admin') {
    res.status(400);
    throw new Error('Direct admin registration is not allowed');
  }

  let uploadedImageUrl = profilePicture;
  if (profilePicture && profilePicture.startsWith('data:image')) {
    try {
      const result = await uploadImage(profilePicture);
      uploadedImageUrl = result.secure_url;
    } catch (uploadError) {
      res.status(500);
      throw new Error('Error uploading profile picture: ' + uploadError.message);
    }
  }

  const userData = {
    name,
    email,
    password,
    role: role || 'student',
    profilePicture: uploadedImageUrl || 'https://i.pravatar.cc/150?img=68', // Default avatar
  };

  if (userData.role === 'student') {
    if (gender) userData.gender = gender;
    if (rollNo) userData.rollNo = rollNo;
    if (department) userData.department = department;
  }

  if (userData.role === 'organizer') {
    if (gender) userData.gender = gender;
    if (rollNo) userData.rollNo = rollNo;
    if (department) userData.department = department;
    if (societyName) userData.societyName = societyName;
  }

  const user = await User.create(userData);

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      gender: user.gender,
      rollNo: user.rollNo,
      department: user.department,
      societyName: user.societyName,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Get registered events for a student
// @route   GET /api/users/registeredevents
// @access  Private/Student
const getRegisteredEvents = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('registeredEvents.eventId'); // Populate the nested eventId

  if (user) {
    res.json(user.registeredEvents);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password'); // Don't send back passwords
  res.json(users);
});

// @desc    Update user profile by ID
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role; // Allow admin to update role
    user.profilePicture = req.body.profilePicture || user.profilePicture;
    user.gender = req.body.gender || user.gender;
    user.rollNo = req.body.rollNo || user.rollNo;
    user.department = req.body.department || user.department;
    user.societyName = req.body.societyName || user.societyName;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture,
      gender: updatedUser.gender,
      rollNo: updatedUser.rollNo,
      department: updatedUser.department,
      societyName: updatedUser.societyName,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Delete user by ID
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.role === 'admin') {
      res.status(400);
      throw new Error('Cannot delete admin user');
    }
    await user.deleteOne();
    res.json({ message: 'User removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password'); // Exclude password

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      gender: user.gender,
      rollNo: user.rollNo,
      department: user.department,
      societyName: user.societyName,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    let updatedProfilePicture = req.body.profilePicture;
    if (req.body.profilePicture && req.body.profilePicture.startsWith('data:image')) {
      try {
        const result = await uploadImage(req.body.profilePicture);
        updatedProfilePicture = result.secure_url;
      } catch (uploadError) {
        res.status(500);
        throw new Error('Error uploading profile picture: ' + uploadError.message);
      }
    } else if (req.body.profilePicture === '') {
      // Allow clearing the profile picture or setting to default if an empty string is sent
      updatedProfilePicture = 'https://i.pravatar.cc/150?img=68';
    }
    user.profilePicture = updatedProfilePicture;

    user.gender = req.body.gender || user.gender;
    user.rollNo = req.body.rollNo || user.rollNo;
    user.department = req.body.department || user.department;
    user.societyName = req.body.societyName || user.societyName;
    // Role cannot be updated by user themselves, only by admin

    if (req.body.password) {
      user.password = req.body.password; // Mongoose pre-save hook will hash it
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture,
      gender: updatedUser.gender,
      rollNo: updatedUser.rollNo,
      department: updatedUser.department,
      societyName: updatedUser.societyName,
      token: generateToken(updatedUser._id), // Generate new token if profile is updated
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Request password reset
// @route   POST /api/users/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('User with that email does not exist');
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;

  const message = `
    <h1>You have requested a password reset</h1>
    <p>Please go to this link to reset your password:</p>
    <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
    <p>This link is valid for 10 minutes only.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      message,
    });

    res.status(200).json({ success: true, data: 'Email Sent' });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    console.error('Error sending email:', err);
    res.status(500);
    throw new Error('Email could not be sent. Please try again later.');
  }
});

// @desc    Reset password
// @route   PUT /api/users/resetpassword/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  if (req.body.password !== req.body.confirmPassword) {
    res.status(400);
    throw new Error('Passwords do not match');
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.status(200).json({ success: true, data: 'Password reset successful' });
});

module.exports = { authUser, registerUser, getRegisteredEvents, getUsers, updateUser, deleteUser, getUserProfile, updateUserProfile, forgotPassword, resetPassword };
