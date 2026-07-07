const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type:      String,
      required:  true,
      unique:    true,
      uppercase: true,
      trim:      true,
    },
    discountType: {
      type:    String,
      enum:    ['percentage', 'fixed'],
      default: 'percentage',
    },
    discountValue: {
      type:     Number,
      required: true,
      min:      0,
    },
    maxDiscount:    { type: Number, default: null },
    minOrderAmount: { type: Number, default: 0 },
    expiresAt:      { type: Date,   default: null },
    usageLimit:     { type: Number, default: null },
    usedCount:      { type: Number, default: 0 },
    usedBy: [
      {
        user:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
        usedAt: { type: Date, default: Date.now },
      },
    ],
    isActive:  { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

// ── Validate coupon ───────────────────────────────────────────────────────────
couponSchema.methods.isValid = function (userId, orderAmount) {
  if (!this.isActive)
    return { valid: false, message: 'Coupon is inactive.' };

  if (this.expiresAt && new Date() > this.expiresAt)
    return { valid: false, message: 'Coupon has expired.' };

  if (this.usageLimit !== null && this.usedCount >= this.usageLimit)
    return { valid: false, message: 'Coupon usage limit reached.' };

  const alreadyUsed = this.usedBy.some(
    (u) => u.user.toString() === userId.toString()
  );
  if (alreadyUsed)
    return { valid: false, message: 'You have already used this coupon.' };

  if (orderAmount < this.minOrderAmount)
    return {
      valid:   false,
      message: `Minimum order amount is ${this.minOrderAmount}.`,
    };

  return { valid: true };
};

// ── Calculate discount ────────────────────────────────────────────────────────
couponSchema.methods.calcDiscount = function (amount) {
  let discount = 0;
  if (this.discountType === 'percentage') {
    discount = (amount * this.discountValue) / 100;
    if (this.maxDiscount) discount = Math.min(discount, this.maxDiscount);
  } else {
    discount = this.discountValue;
  }
  return Math.min(discount, amount);
};

module.exports = mongoose.model('Coupon', couponSchema);