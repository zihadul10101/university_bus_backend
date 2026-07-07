const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    durationDays: {
      type: Number,
      required: true,
      min: 1, // Any value greater than or equal to 1
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    isFree: {
      type: Boolean,
      default: false,
    },

    features: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    maxAdsPerStudent: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Package", packageSchema);