const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: { type: String, required: true },

  departmentName: { type: String, required: true },

  mobileNumber: { type: String, required: true },

  otp: Number,
  otpExpire: Date,

  lastLogin: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);