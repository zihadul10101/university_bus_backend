const Coupon = require('../../models/entrepreneur/Coupon');

// ── Create coupon ─────────────────────────────────────────────────────────────
exports.createCoupon = async (req, res) => {
  try {
    const existing = await Coupon.findOne({ code: req.body.code?.toUpperCase() });
    if (existing)
      return res.status(400).json({ success: false, message: 'Coupon code already exists.' });

    const coupon = await Coupon.create({
      ...req.body,
      code:      req.body.code?.toUpperCase(),
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// ── Get all coupons (admin) ───────────────────────────────────────────────────
exports.getAllCoupons = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, total: coupons.length, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get coupon by code ────────────────────────────────────────────────────────
exports.getCouponByCode = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      code:     req.params.code.toUpperCase(),
      isActive: true,
    });
    if (!coupon)
      return res.status(404).json({ success: false, message: 'Coupon not found.' });

    res.json({
      success: true,
      data: {
        code:          coupon.code,
        discountType:  coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount:   coupon.maxDiscount,
        expiresAt:     coupon.expiresAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Validate coupon + calculate discount ──────────────────────────────────────
exports.validateCoupon = async (req, res) => {
  try {
    const { code, amount } = req.body;

    if (!code || !amount)
      return res.status(400).json({ success: false, message: 'code and amount are required.' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon)
      return res.status(404).json({ success: false, message: 'Coupon not found.' });

    const validity = coupon.isValid(req.user.id, Number(amount));
    if (!validity.valid)
      return res.status(400).json({ success: false, message: validity.message });

    const discount    = coupon.calcDiscount(Number(amount));
    const finalAmount = Number(amount) - discount;

    res.json({
      success: true,
      data: {
        code:          coupon.code,
        discountType:  coupon.discountType,
        discountValue: coupon.discountValue,
        discount,
        finalAmount,
        isFree: finalAmount === 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update coupon ─────────────────────────────────────────────────────────────
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!coupon)
      return res.status(404).json({ success: false, message: 'Coupon not found.' });

    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete coupon ─────────────────────────────────────────────────────────────
exports.deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Coupon deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};