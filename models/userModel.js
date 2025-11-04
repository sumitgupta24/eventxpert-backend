const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'organizer', 'student'],
      default: 'student',
    },
    profilePicture: {
      type: String,
      default: 'https://i.pravatar.cc/150', // Default avatar
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    },
    rollNo: {
      type: String,
      unique: true,
      sparse: true, // Allows null values to not violate unique constraint
    },
    department: {
      type: String,
    },
    societyName: {
      type: String,
    },
    registeredEvents: [
      {
        eventId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Event',
          required: true,
        },
        registrationCode: {
          type: String,
          sparse: true,
        },
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
