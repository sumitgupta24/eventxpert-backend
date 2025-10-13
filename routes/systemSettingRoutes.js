const express = require('express');
const { getSystemSettings, updateSystemSetting } = require('../controllers/systemSettingController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, admin, getSystemSettings);
router.route('/:id').put(protect, admin, updateSystemSetting);

module.exports = router;
