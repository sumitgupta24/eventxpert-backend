const express = require('express');
const { authUser, registerUser, getRegisteredEvents, getUsers, updateUser, deleteUser, updateUserProfile, getUserProfile, forgotPassword, resetPassword } = require('../controllers/userController');
const { protect, admin, organizer } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(registerUser).get(protect, admin, getUsers);
router.post('/login', authUser);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword); 
router.get('/registeredevents', protect, getRegisteredEvents);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/:id').put(protect, admin, updateUser).delete(protect, admin, deleteUser);

module.exports = router;
