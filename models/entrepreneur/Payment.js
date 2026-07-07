const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Student',
      required: true,
    },
    advertisement: { type: mongoose.Schema.Types.ObjectId, ref: 'Advertisement', default: null },
    package:       { type: mongoose.Schema.Types.ObjectId, ref: 'Package',       required: true },
    coupon:        { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon',        default: null },

    originalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    finalAmount:    { type: Number, required: true },
    isFree:         { type: Boolean, default: false },

    paymentMethod: {
      type:    String,
      enum:    ['free', 'bkash', 'nagad', 'rocket', 'card', 'cash'],
      default: 'free',
    },
    transactionId: { type: String, default: null },

    status: {
      type:    String,
      enum:    ['pending', 'verified', 'rejected', 'refunded'],
      default: 'pending',
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    verifiedAt: { type: Date, default: null },

    screenshot: {
      url:      { type: String, default: null },
      publicId: { type: String, default: null },
    },
    note: { type: String, default: null },
  },
  { timestamps: true }
);

// module.exports = mongoose.model('EntPayment', paymentSchema);
module.exports = mongoose.model('Payment', paymentSchema);