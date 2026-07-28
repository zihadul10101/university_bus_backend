
const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },

  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
    // Format: XXX-XXX-XXX  (example: 666-609-091)
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: { type: String, required: true },

  departmentName: { type: String, required: true },

  role: { type: String, default: 'student' },

  isVerified: { type: Boolean, default: false },

  otp: Number,
  otpExpire: Date,

  lastLogin: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);