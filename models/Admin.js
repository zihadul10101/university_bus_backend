const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: { type: String, required: true },

  role: {
    type: String,
    enum: ['super_admin', 'sub_admin'],
    default: 'sub_admin'
  },
  deviceToken: {
  type: String
},
otp: Number,
otpExpire: Date,
  permissions: {
    canManageBuses: { type: Boolean, default: false },
    canManageStudents: { type: Boolean, default: false },
    canPostNotices: { type: Boolean, default: false },
    canViewTracking: { type: Boolean, default: false }
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);
