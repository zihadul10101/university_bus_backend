const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema(
  {
    business: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Business',
      required: true,
    },
    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Student',
      required: true,
    },
    title: {
      type:      String,
      required:  [true, 'Ad title is required'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    shortDescription: {
      type:      String,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
    },
    bannerImage: {
      url:      { type: String, default: null },
      publicId: { type: String, default: null },
    },
    package: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Package',
      required: true,
    },
    coupon:  { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon',  default: null },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },

    status: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected', 'hidden', 'expired'],
      default: 'pending',
    },
    isFeatured:      { type: Boolean, default: false },
    rejectionReason: { type: String,  default: null },

    startDate:    { type: Date,   default: null },
    endDate:      { type: Date,   default: null },
    durationDays: { type: Number, default: 7 },

    // Analytics
    views:          { type: Number, default: 0 },
    callClicks:     { type: Number, default: 0 },
    whatsappClicks: { type: Number, default: 0 },
    socialClicks:   { type: Number, default: 0 },
    shareCount:     { type: Number, default: 0 },

    isRenewal:   { type: Boolean, default: false },
    previousAd:  { type: mongoose.Schema.Types.ObjectId, ref: 'Advertisement', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Advertisement', advertisementSchema);