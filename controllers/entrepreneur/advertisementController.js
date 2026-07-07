const Advertisement = require('../../models/entrepreneur/Advertisement');
const Business = require('../../models/entrepreneur/Business');
const Package = require('../../models/entrepreneur/Package');
const Coupon = require('../../models/entrepreneur/Coupon');
const Payment = require('../../models/entrepreneur/Payment');

// ── Submit advertisement ──────────────────────────────────────────────────────
exports.submitAd = async (req, res) => {
  try {
    const {
      businessId, title, shortDescription,
      packageId, couponCode,
      paymentMethod, transactionId,
    } = req.body;
    console.log("Business ID:", businessId);
    console.log("Logged User:", req.user.id);
    // Validate business ownership
    const business = await Business.findOne({
      _id: businessId,
      owner: req.user.id,
      status: 'approved',
    });
    // console.log(req.user);
    // const business = await Business.findById(businessId);

    // console.log("Business:", business);
    // console.log("Owner:", business?.owner?.toString());
    // console.log("User:", req.user._id.toString());
    // console.log("Status:", business?.status);
    if (!business)
      return res.status(404).json({
        success: false,
        message: 'Approved business not found or not yours.',
      });

    // Validate package
    const pkg = await Package.findById(packageId);
    if (!pkg || !pkg.isActive)
      return res.status(404).json({ success: false, message: 'Package not found.' });

    let originalAmount = pkg.price;
    let discountAmount = 0;
    let finalAmount = originalAmount;
    let couponDoc = null;

    // Apply coupon
    if (couponCode) {
      couponDoc = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (!couponDoc)
        return res.status(404).json({ success: false, message: 'Coupon not found.' });

      const validity = couponDoc.isValid(req.user._id, originalAmount);
      if (!validity.valid)
        return res.status(400).json({ success: false, message: validity.message });

      discountAmount = couponDoc.calcDiscount(originalAmount);
      finalAmount = originalAmount - discountAmount;
    }

    const isFree = finalAmount === 0 || pkg.isFree;

    // Create payment record
    const payment = await Payment.create({
      user: req.user.id,
      package: packageId,
      coupon: couponDoc?.id || null,
      originalAmount,
      discountAmount,
      finalAmount,
      isFree,
      paymentMethod: isFree ? 'free' : (paymentMethod || 'bkash'),
      transactionId: isFree ? null : transactionId,
      status: isFree ? 'verified' : 'pending',
    });

    // Create advertisement
    const ad = await Advertisement.create({
      business: businessId,
      owner: req.user.id,
      title,
      shortDescription,
      package: packageId,
      coupon: couponDoc?.id || null,
      payment: payment.id,
      durationDays: pkg.durationDays,
      status: 'pending',
    });

    // Link payment → ad
    payment.advertisement = ad._d;
    await payment.save();

    // Mark coupon as used
    if (couponDoc) {
      couponDoc.usedBy.push({ user: req.user.id });
      couponDoc.usedCount += 1;
      await couponDoc.save();
    }

    res.status(201).json({
      success: true,
      message: isFree
        ? 'Ad submitted. Awaiting admin approval.'
        : 'Ad submitted. Payment pending verification.',
      data: { ad, payment },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get my ads ────────────────────────────────────────────────────────────────
exports.getMyAds = async (req, res) => {
  try {
    const ads = await Advertisement.find({ owner: req.user.id })
      .populate('business', 'name category logo')
      .populate('package',  'name durationDays price')
      .populate('payment',  'status finalAmount paymentMethod')
      .sort({ createdAt: -1 });

    res.json({ success: true, total: ads.length, data: ads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// exports.getMyAds = async (req, res) => {
//   try {
//     console.log("req.user =", req.user);
//     console.log("Searching owner =", req.user.id);

//     const ads = await Advertisement.find({
//       owner: req.user.id,
//     });

//     console.log("Ads found =", ads.length);
//     // const ads = await Advertisement.find({
//     //   owner: req.user.id,
//     // })
//     //   .populate("business", "name category logo")
//     //   .populate("package", "name durationDays price")
//     //   .populate("payment", "status finalAmount paymentMethod")
//     //   .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       total: ads.length,
//       data: ads,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };
// ── Get all approved ads (public feed) ────────────────────────────────────────
exports.getApprovedAds = async (req, res) => {
  try {
    const {
      category, featured,
      page = 1, limit = 20,
    } = req.query;

    const now = new Date();
    const filter = {
      status: 'approved',
      endDate: { $gte: now },
    };

    if (featured) filter.isFeatured = true;
    if (category) {
      const businesses = await Business.find({ category }).select('_id');
      filter.business = { $in: businesses.map((b) => b._id) };
    }

    // Featured first, then by date
    const total = await Advertisement.countDocuments(filter);
    const ads = await Advertisement.find(filter)
      .populate({
        path: 'business',
        select: 'name category logo contact socialLinks location averageRating isVerified',
      })
      .populate('package', 'name durationDays')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), data: ads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get single ad ─────────────────────────────────────────────────────────────
exports.getAdById = async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id)
      .populate('business')
      .populate('package')
      .populate('owner', 'name email');

    if (!ad)
      return res.status(404).json({ success: false, message: 'Ad not found.' });

    // Increment view
    ad.views += 1;
    await ad.save({ validateBeforeSave: false });

    res.json({ success: true, data: ad });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Track clicks ──────────────────────────────────────────────────────────────
exports.trackClick = async (req, res) => {
  try {
    const { type } = req.body;
    const inc = {};

    if (type === 'call') inc.callClicks = 1;
    if (type === 'whatsapp') inc.whatsappClicks = 1;
    if (type === 'social') inc.socialClicks = 1;
    if (type === 'share') inc.shareCount = 1;

    await Advertisement.findByIdAndUpdate(req.params.id, { $inc: inc });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Renew ad ──────────────────────────────────────────────────────────────────
exports.renewAd = async (req, res) => {
  try {
    const { packageId, couponCode, paymentMethod, transactionId } = req.body;

    const oldAd = await Advertisement.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate('business');

    if (!oldAd)
      return res.status(404).json({ success: false, message: 'Ad not found.' });

    const pkg = await Package.findById(packageId);
    if (!pkg)
      return res.status(404).json({ success: false, message: 'Package not found.' });

    let originalAmount = pkg.price;
    let discountAmount = 0;
    let finalAmount = originalAmount;
    let couponDoc = null;

    if (couponCode) {
      couponDoc = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (couponDoc) {
        const validity = couponDoc.isValid(req.user._id, originalAmount);
        if (validity.valid) {
          discountAmount = couponDoc.calcDiscount(originalAmount);
          finalAmount = originalAmount - discountAmount;
        }
      }
    }

    const isFree = finalAmount === 0 || pkg.isFree;

    const payment = await Payment.create({
      user: req.user._id,
      package: packageId,
      coupon: couponDoc?._id || null,
      originalAmount,
      discountAmount,
      finalAmount,
      isFree,
      paymentMethod: isFree ? 'free' : (paymentMethod || 'bkash'),
      transactionId: isFree ? null : transactionId,
      status: isFree ? 'verified' : 'pending',
    });

    const newAd = await Advertisement.create({
      business: oldAd.business._id,
      owner: req.user._id,
      title: oldAd.title,
      shortDescription: oldAd.shortDescription,
      bannerImage: oldAd.bannerImage,
      package: packageId,
      coupon: couponDoc?._id || null,
      payment: payment._id,
      durationDays: pkg.durationDays,
      status: 'pending',
      isRenewal: true,
      previousAd: oldAd._id,
    });

    payment.advertisement = newAd._id;
    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Ad renewal submitted.',
      data: newAd,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: Get all ads ────────────────────────────────────────────────────────
exports.adminGetAllAds = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total = await Advertisement.countDocuments(filter);
    const ads = await Advertisement.find(filter)
      .populate('business', 'name category')
      .populate('owner', 'name email')
      .populate('package', 'name price durationDays')
      .populate('payment', 'status finalAmount')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, total, data: ads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: Approve / Reject / Hide / Feature ──────────────────────────────────
exports.adminUpdateAdStatus = async (req, res) => {
  try {
    const { status, rejectionReason, isFeatured, endDate } = req.body;

    const ad = await Advertisement.findById(req.params.id);
    if (!ad)
      return res.status(404).json({ success: false, message: 'Ad not found.' });

    if (status) ad.status = status;
    if (rejectionReason) ad.rejectionReason = rejectionReason;
    if (isFeatured !== undefined) ad.isFeatured = isFeatured;

    // Set dates on approval
    if (status === 'approved' && !ad.startDate) {
      ad.startDate = new Date();
      ad.endDate = endDate
        ? new Date(endDate)
        : new Date(Date.now() + ad.durationDays * 24 * 60 * 60 * 1000);
    }

    await ad.save();
    res.json({ success: true, data: ad });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: Dashboard stats ────────────────────────────────────────────────────
exports.adminDashboard = async (req, res) => {
  try {
    const Business = require('../../models/entrepreneur/Business');
    const Payment = require('../../models/entrepreneur/Payment');

    const now = new Date();

    const [
      totalBusinesses,
      pendingBusinesses,
      approvedBusinesses,
      totalAds,
      pendingAds,
      approvedAds,
      activeAds,
      expiredAds,
      revenueData,
    ] = await Promise.all([
      Business.countDocuments({ isDeleted: false }),
      Business.countDocuments({ status: 'pending' }),
      Business.countDocuments({ status: 'approved' }),
      Advertisement.countDocuments({}),
      Advertisement.countDocuments({ status: 'pending' }),
      Advertisement.countDocuments({ status: 'approved' }),
      Advertisement.countDocuments({ status: 'approved', endDate: { $gte: now } }),
      Advertisement.countDocuments({ status: 'expired' }),
      Payment.aggregate([
        { $match: { status: 'verified', isFree: false } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        businesses: { total: totalBusinesses, pending: pendingBusinesses, approved: approvedBusinesses },
        ads: { total: totalAds, pending: pendingAds, approved: approvedAds, active: activeAds, expired: expiredAds },
        revenue: revenueData[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};