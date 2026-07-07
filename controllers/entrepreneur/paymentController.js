const Payment       = require('../../models/entrepreneur/Payment');
const Advertisement = require('../../models/entrepreneur/Advertisement');

// ── My payments ───────────────────────────────────────────────────────────────
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate('package',       'name durationDays price')
      .populate('advertisement', 'title status')
      .sort({ createdAt: -1 });

    res.json({ success: true, total: payments.length, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: All payments ───────────────────────────────────────────────────────
exports.adminGetAllPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total    = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('user',          'name email mobileNumber')
      .populate('package',       'name price durationDays')
      .populate('advertisement', 'title status')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: Verify / Reject payment ───────────────────────────────────────────
exports.adminVerifyPayment = async (req, res) => {

  try {
    const { status, note } = req.body;

    if (!['verified', 'rejected', 'refunded'].includes(status))
      return res.status(400).json({
        success: false,
        message: 'status must be verified, rejected or refunded.',
      });
  console.log("Payment ID:", req.params.id);
    const payment = await Payment.findById(req.params.id);
    console.log("payment",payment);
    console.log("Database:", Payment.db.name);
console.log("Collection:", Payment.collection.name);
console.log("Model:", Payment.modelName);
    
    if (!payment)
      return res.status(404).json({ success: false, message: 'Payment not found.' });

    payment.status     = status;
    payment.verifiedBy = req.user.id;
    payment.verifiedAt = new Date();
    if (note) payment.note = note;
    await payment.save();

    // On verified → keep ad as pending for admin ad-review
    // On rejected → mark ad as rejected too
    if (payment.advertisement) {
      if (status === 'rejected') {
        await Advertisement.findByIdAndUpdate(payment.advertisement, {
          status:          'rejected',
          rejectionReason: 'Payment was rejected.',
        });
      }
    }

    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: Revenue report ─────────────────────────────────────────────────────
exports.adminRevenueReport = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const monthly = await Payment.aggregate([
      {
        $match: {
          status: 'verified',
          isFree: false,
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id:     { month: { $month: '$createdAt' } },
          revenue: { $sum: '$finalAmount' },
          count:   { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const totalRevenue = monthly.reduce((sum, m) => sum + m.revenue, 0);
    const totalOrders  = monthly.reduce((sum, m) => sum + m.count,   0);

    res.json({ success: true, year: Number(year), totalRevenue, totalOrders, monthly });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};