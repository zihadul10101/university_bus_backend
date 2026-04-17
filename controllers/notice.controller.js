const Notice = require("../models/Notice");
const mongoose = require("mongoose");


// ✅ Create Notice
exports.createNotice = async (req, res) => {
  try {
    const { title, message, type } = req.body;

    const notice = await Notice.create({
      title,
      message,
      type,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: "Notice created successfully",
      data: notice
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ✅ Get All Notices (Everyone)
exports.getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.find({ isDeleted: false })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      total: notices.length,
      data: notices
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ✅ Get Single Notice
exports.getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Notice ID" });
    }

    const notice = await Notice.findOne({ _id: id, isDeleted: false });

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    res.json({
      success: true,
      data: notice
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ✅ Update Notice (Admin only)
exports.updateNotice = async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findOneAndUpdate(
      { _id: id, isDeleted: false },
      req.body,
      { new: true }
    );

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    res.json({
      success: true,
      message: "Notice updated successfully",
      data: notice
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ✅ Delete Notice (Soft Delete)
exports.deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findOneAndUpdate(
      { _id: id },
      { isDeleted: true },
      { new: true }
    );

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    res.json({
      success: true,
      message: "Notice deleted successfully"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};