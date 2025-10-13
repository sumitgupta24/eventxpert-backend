const mongoose = require('mongoose');

const systemSettingSchema = mongoose.Schema(
  {
    settingName: {
      type: String,
      required: true,
      unique: true,
    },
    settingValue: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

module.exports = SystemSetting;
