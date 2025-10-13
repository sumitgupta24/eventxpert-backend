const express = require('express');
const { getAdminStats, getEventCategoryCounts, getEventMonthCounts } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', protect, admin, getAdminStats);
router.get('/event-category-counts', protect, admin, getEventCategoryCounts);
router.get('/event-month-counts', protect, admin, getEventMonthCounts);

module.exports = router;
