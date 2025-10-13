const asyncHandler = require('express-async-handler');
const Event = require('../models/eventModel');
const User = require('../models/userModel'); // Added User model import
const { v4: uuidv4 } = require('uuid'); // Import uuid
const { uploadImage } = require('../config/cloudinary'); // Import uploadImage helper

// @desc    Get all events with search, filter, and sort
// @route   GET /api/events
// @access  Public
const getEvents = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword
    ? {
        $or: [
          { title: { $regex: req.query.keyword, $options: 'i' } },
          { description: { $regex: req.query.keyword, $options: 'i' } },
        ],
      }
    : {};

  const category = req.query.category ? { category: req.query.category } : {};

  const dateFilter = {};
  if (req.query.dateRange === 'upcoming') {
    dateFilter.date = { $gte: new Date() }; // Events from today onwards
  } else if (req.query.dateRange === 'past') {
    dateFilter.date = { $lt: new Date() }; // Events before today
  }

  const sortOptions = {};
  if (req.query.sortBy) {
    sortOptions[req.query.sortBy] = req.query.order === 'desc' ? -1 : 1;
  } else {
    sortOptions.date = 1; // Default sort by date ascending
  }

  // Only show approved events for public access
  const baseQuery = {
    ...keyword,
    ...category,
    ...dateFilter,
    isApproved: true,
  };

  const events = await Event.find(baseQuery)
    .populate('organizer', 'name email')
    .sort(sortOptions);

  res.json(events);
});

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name email');

  if (event) {
    res.json(event);
  } else {
    res.status(404);
    throw new Error('Event not found');
  }
});

// @desc    Create an event
// @route   POST /api/events
// @access  Private/Organizer
const createEvent = asyncHandler(async (req, res) => {
  const { title, description, date, startTime, endTime, location, category, eventImage } = req.body;

  let uploadedImageUrl = eventImage;
  if (eventImage && eventImage.startsWith('data:image')) {
    const result = await uploadImage(eventImage, "event_images");
    uploadedImageUrl = result.secure_url;
  }

  const event = new Event({
    title,
    description,
    date,
    startTime,
    endTime,
    location,
    organizer: req.user._id, // Organizer will be the logged-in user
    category,
    isApproved: false, // New events need admin approval
    eventImage: uploadedImageUrl || "https://via.placeholder.com/400x200?text=Event+Image",
  });

  const createdEvent = await event.save();
  res.status(201).json(createdEvent);
});

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private/Organizer
const updateEvent = asyncHandler(async (req, res) => {
  const { title, description, date, startTime, endTime, location, category, eventImage } = req.body;

  const event = await Event.findById(req.params.id);

  if (event) {
    // Check if the logged-in user is the organizer of the event
    if (event.organizer.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to update this event');
    }

    event.title = title || event.title;
    event.description = description || event.description;
    event.date = date || event.date;
    event.startTime = startTime || event.startTime;
    event.endTime = endTime || event.endTime;
    event.location = location || event.location;
    event.category = category || event.category;

    // Handle event image update
    let updatedEventImage = eventImage;
    if (eventImage && eventImage.startsWith('data:image')) {
      const result = await uploadImage(eventImage, "event_images");
      updatedEventImage = result.secure_url;
    } else if (eventImage === "") {
      updatedEventImage = "https://via.placeholder.com/400x200?text=Event+Image";
    }
    event.eventImage = updatedEventImage || event.eventImage;

    const updatedEvent = await event.save();
    res.json(updatedEvent);
  } else {
    res.status(404);
    throw new Error('Event not found');
  }
});

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private/Organizer/Admin
const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (event) {
    // Check if the logged-in user is the organizer or an admin
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(401);
      throw new Error('Not authorized to delete this event');
    }
    await event.deleteOne();
    res.json({ message: 'Event removed' });
  } else {
    res.status(404);
    throw new Error('Event not found');
  }
});

// @desc    Get events created by the logged-in organizer
// @route   GET /api/events/myevents
// @access  Private/Organizer
const getMyEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ organizer: req.user._id }).populate('organizer', 'name email');
  res.json(events);
});

// @desc    Register student for an event
// @route   POST /api/events/:id/register
// @access  Private/Student
const registerEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (event) {
    const user = await User.findById(req.user._id);

    if (user) {
      // Filter out any invalid existing registeredEvents entries in memory after fetching
      user.registeredEvents = user.registeredEvents.filter(entry =>
        entry.eventId && entry.registrationCode
      );

      // Check if user is already registered for this event
      const alreadyRegistered = user.registeredEvents.some(
        (regEvent) => regEvent.eventId && regEvent.eventId.toString() === event._id.toString()
      );

      if (alreadyRegistered) {
        res.status(400);
        throw new Error('Already registered for this event');
      }

      // Generate a unique registration code
      const registrationCode = uuidv4();

      user.registeredEvents.push({
        eventId: event._id,
        registrationCode: registrationCode,
      });

      await user.save();
      res.status(200).json({ message: 'Event registered successfully', registrationCode: registrationCode });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } else {
    res.status(404);
    throw new Error('Event not found');
  }
});

const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');

// @desc    Generate QR code for an event
// @route   GET /api/events/:id/qrcode
// @access  Private/Organizer, Student (for own registered events)
const generateEventQRCode = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const registeredEvent = user.registeredEvents.find(
    (regEvent) => regEvent.eventId.toString() === eventId.toString()
  );

  if (!registeredEvent) {
    res.status(404);
    throw new Error('User is not registered for this event');
  }

  // Return only the registration code
  res.json({ qrCode: registeredEvent.registrationCode });
});

// @desc    Verify QR code
// @route   POST /api/events/verifyqr
// @access  Private/Organizer
const verifyQRCode = asyncHandler(async (req, res) => {
  const { qrCode } = req.body; // Changed from qrToken to qrCode

  if (!qrCode) {
    res.status(400);
    throw new Error('QR code is required');
  }

  try {
    // Find the user and event by the registration code
    const user = await User.findOne({ 'registeredEvents.registrationCode': qrCode });

    if (!user) {
      res.status(404);
      throw new Error('Invalid QR code or registration not found');
    }

    const registeredEvent = user.registeredEvents.find(
      (regEvent) => regEvent.registrationCode === qrCode
    );

    if (!registeredEvent) {
      res.status(404);
      throw new Error('Invalid QR code or registration not found');
    }

    const event = await Event.findById(registeredEvent.eventId);

    if (!event) {
      res.status(404);
      throw new Error('Event not found for this registration');
    }

    res.json({
      message: 'QR code verified successfully',
      event: { id: event._id, title: event.title, location: event.location },
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(401);
    throw new Error('Invalid QR code');
  }
});

// @desc    Get all pending events (for admin approval)
// @route   GET /api/events/pending
// @access  Private/Admin
const getPendingEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ isApproved: false }).populate('organizer', 'name email');
  res.json(events);
});

// @desc    Approve an event
// @route   PUT /api/events/:id/approve
// @access  Private/Admin
const approveEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (event) {
    event.isApproved = true;
    const updatedEvent = await event.save();
    res.json(updatedEvent);
  } else {
    res.status(404);
    throw new Error('Event not found');
  }
});

// @desc    Reject an event (set isApproved to false)
// @route   PUT /api/events/:id/reject
// @access  Private/Admin
const rejectEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (event) {
    event.isApproved = false;
    const updatedEvent = await event.save();
    res.json(updatedEvent);
  } else {
    res.status(404);
    throw new Error('Event not found');
  }
});

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent, getMyEvents, registerEvent, generateEventQRCode, verifyQRCode, getPendingEvents, approveEvent, rejectEvent };
