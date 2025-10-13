const express = require('express');
const { getEvents, getEventById, createEvent, updateEvent, deleteEvent, getMyEvents, registerEvent, generateEventQRCode, verifyQRCode, getPendingEvents, approveEvent, rejectEvent } = require('../controllers/eventController');
const { protect, admin, organizer } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(getEvents).post(protect, organizer, createEvent);
router.get('/myevents', protect, organizer, getMyEvents);
router.get('/pending', protect, admin, getPendingEvents); // New route for pending events
router.route('/:id/qrcode').get(protect, generateEventQRCode);
router.route('/verifyqr').post(protect, organizer, verifyQRCode);
router.route('/:id/register').post(protect, registerEvent);
router.route('/:id').get(getEventById).put(protect, organizer, updateEvent);
router.route('/:id').delete(protect, admin, deleteEvent);
router.route('/:id/approve').put(protect, admin, approveEvent); // New route for approving events
router.route('/:id/reject').put(protect, admin, rejectEvent); // New route for rejecting events

module.exports = router;
