const asyncHandler = require('express-async-handler');
const SystemSetting = require('../models/systemSettingModel');

// @desc    Get all system settings
// @route   GET /api/settings
// @access  Private/Admin
const getSystemSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSetting.find({});
  res.json(settings);
});

// @desc    Update a system setting
// @route   PUT /api/settings/:id
// @access  Private/Admin
const updateSystemSetting = asyncHandler(async (req, res) => {
  const { settingValue } = req.body;

  const setting = await SystemSetting.findById(req.params.id);

  if (setting) {
    setting.settingValue = settingValue || setting.settingValue;
    const updatedSetting = await setting.save();
    res.json(updatedSetting);
  } else {
    res.status(404);
    throw new Error('Setting not found');
  }
});

module.exports = { getSystemSettings, updateSystemSetting };
