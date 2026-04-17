const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: { type: String, required: true },

  mobile: { type: String, required: true, unique: true },
  licenseNumber: { type: String, required: true, unique: true },
  loginName: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true,
      default: [0, 0] // VERY IMPORTANT
    }
  },
 isOnline: { type: Boolean, default: false },
  lastUpdated: { type: Date },
  isDeleted: { type: Boolean, default: false }

}, { timestamps: true });

// ✅ Correct index
DriverSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('Driver', DriverSchema);