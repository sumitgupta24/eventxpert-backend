const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const Event = require('../models/eventModel');
const Category = require('../models/categoryModel');

const getAdminStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalEvents = await Event.countDocuments();
  const totalCategories = await Category.countDocuments();
  const pendingEvents = await Event.countDocuments({ isApproved: false });
  const approvedEvents = await Event.countDocuments({ isApproved: true });

  res.json({
    totalUsers,
    totalEvents,
    totalCategories,
    pendingEvents,
    approvedEvents,
  });
});

const getEventCategoryCounts = asyncHandler(async (req, res) => {
  const categoryCounts = await Event.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $project: { _id: 0, name: '$_id', value: '$count' } },
  ]);

  res.json(categoryCounts);
});

const getEventMonthCounts = asyncHandler(async (req, res) => {
  const monthCounts = await Event.aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, count: { $sum: 1 } } },
    { $sort: { '_id': 1 } },
    { $project: { _id: 0, month: '$_id', events: '$count' } },
  ]);

  res.json(monthCounts);
});

module.exports = { getAdminStats, getEventCategoryCounts, getEventMonthCounts };
