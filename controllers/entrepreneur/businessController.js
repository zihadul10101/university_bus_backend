const Business = require('../../models/entrepreneur/Business');

// ── Create business ───────────────────────────────────────────────────────────
exports.createBusiness = async (req, res) => {
  try {
    const { name, category, description, contact, socialLinks, location } = req.body;

    if (!name || !category || !description)
      return res.status(400).json({
        success: false,
        message: 'name, category and description are required.',
      });

    const business = await Business.create({
      owner:       req.user.id,
      name, category, description,
      contact:     contact     || {},
      socialLinks: socialLinks || {},
      location:    location    || {},
    });

    res.status(201).json({ success: true, data: business });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get my businesses ─────────────────────────────────────────────────────────
exports.getMyBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({
      owner:     req.user.id,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.json({ success: true, total: businesses.length, data: businesses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get all approved businesses (public) ──────────────────────────────────────
exports.getAllBusinesses = async (req, res) => {
  try {
    const {
      category, search, featured,
      page = 1, limit = 20,
      sortBy = 'createdAt',
    } = req.query;

    const filter = { status: 'approved', isDeleted: false };
    if (category) filter.category   = category;
    if (featured) filter.isFeatured = true;
    if (search) {
      filter.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = {};
    if (sortBy === 'rating')       sort.averageRating = -1;
    else if (sortBy === 'popular') sort.totalViews    = -1;
    else                           sort.createdAt     = -1;

    const total      = await Business.countDocuments(filter);
    const businesses = await Business.find(filter)
      .populate('owner', 'name email mobileNumber')
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), data: businesses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get single business ───────────────────────────────────────────────────────
exports.getBusinessById = async (req, res) => {
   console.log("Requested ID:", req.params.id);
  try {
    const business = await Business.findOne({
      _id:       req.params.id,
      isDeleted: false,
    }).populate('owner', 'name email mobileNumber');
     console.log("Business:", business);
    if (!business)
      return res.status(404).json({ success: false, message: 'Business not found.' });

    business.totalViews += 1;
    await business.save({ validateBeforeSave: false });

    res.json({ success: true, data: business });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update business ───────────────────────────────────────────────────────────
exports.updateBusiness = async (req, res) => {
  try {
    const business = await Business.findOne({
      _id:       req.params.id,
      owner:     req.user.id,
      isDeleted: false,
    });

    if (!business)
      return res.status(404).json({ success: false, message: 'Business not found.' });

    const allowed = ['name', 'category', 'description', 'contact', 'socialLinks', 'location'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) business[key] = req.body[key];
    });

    business.status = 'pending'; // re-review after update
    await business.save();

    res.json({ success: true, data: business });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Soft delete business ──────────────────────────────────────────────────────
exports.deleteBusiness = async (req, res) => {
  try {
    const business = await Business.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { isDeleted: true },
      { new: true }
    );

    if (!business)
      return res.status(404).json({ success: false, message: 'Business not found.' });

    res.json({ success: true, message: 'Business deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Add / update rating ───────────────────────────────────────────────────────
exports.addRating = async (req, res) => {
  try {
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });

    const business = await Business.findById(req.params.id);
    if (!business)
      return res.status(404).json({ success: false, message: 'Business not found.' });

    const existing = business.ratings.find(
      (r) => r.user.toString() === req.user.id.toString()
    );

    if (existing) {
      existing.rating = rating;
      existing.review = review;
    } else {
      business.ratings.push({ user: req.user.id, rating, review });
    }

    business.calcAverageRating();
    await business.save();

    res.json({
      success:       true,
      averageRating: business.averageRating,
      totalRatings:  business.totalRatings,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Track contact click ───────────────────────────────────────────────────────
exports.trackContactClick = async (req, res) => {
  try {
    await Business.findByIdAndUpdate(req.params.id, {
      $inc: { totalContactClicks: 1 },
    });
    res.json({ success: true, message: 'Click tracked.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: Get all businesses ─────────────────────────────────────────────────
exports.adminGetAllBusinesses = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: false };
    if (status) filter.status = status;

    const total      = await Business.countDocuments(filter);
    const businesses = await Business.find(filter)
      .populate('owner', 'name email mobileNumber departmentName')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), data: businesses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: Update business status ─────────────────────────────────────────────
exports.adminUpdateBusinessStatus = async (req, res) => {
  try {
    const { status, rejectionReason, isVerified, isFeatured } = req.body;

    const update = {};
    if (status)                    update.status          = status;
    if (rejectionReason)           update.rejectionReason = rejectionReason;
    if (isVerified  !== undefined) update.isVerified      = isVerified;
    if (isFeatured  !== undefined) update.isFeatured      = isFeatured;

    const business = await Business.findByIdAndUpdate(
      req.params.id, update, { new: true }
    );

    if (!business)
      return res.status(404).json({ success: false, message: 'Business not found.' });

    res.json({ success: true, data: business });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};