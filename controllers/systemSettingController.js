const asyncHandler = require('express-async-handler');
const SystemSetting = require('../models/systemSettingModel');


const getSystemSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSetting.find({});
  res.json(settings);
});


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
