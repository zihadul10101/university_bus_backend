const Package = require('../../models/entrepreneur/Package');

// ── Create package ────────────────────────────────────────────────────────────
exports.createPackage = async (req, res) => {
  try {
    const { name, description, durationDays, price, isFree, features, maxAdsPerStudent } = req.body;

    if (!name || !durationDays || price === undefined)
      return res.status(400).json({ success: false, message: 'name, durationDays and price are required.' });

    const pkg = await Package.create({
      name, description, durationDays, price,
      isFree:           isFree || price === 0,
      features:         features || [],
      maxAdsPerStudent: maxAdsPerStudent || 1,
    });

    res.status(201).json({ success: true, data: pkg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPackageById = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    res.status(200).json({
      success: true,
      data: pkg,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// ── Get all active packages ───────────────────────────────────────────────────
exports.getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true }).sort({ price: 1 });
    res.json({ success: true, total: packages.length, data: packages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update package ────────────────────────────────────────────────────────────
exports.updatePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!pkg)
      return res.status(404).json({ success: false, message: 'Package not found.' });

    res.json({ success: true, data: pkg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Deactivate package ────────────────────────────────────────────────────────
exports.deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndUpdate(
      req.params.id, { isActive: false }, { new: true }
    );
    if (!pkg)
      return res.status(404).json({ success: false, message: 'Package not found.' });

    res.json({ success: true, message: 'Package deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};