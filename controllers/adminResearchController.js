const Research = require("../models/Research");
const Admin = require("../models/Admin");

exports.getAllForAdmin = async (req, res) => {
  try {
    const { status, department, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const skip = (Number(page) - 1) * Number(limit);

    const [papers, total] = await Promise.all([
      Research.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Research.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: papers.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: papers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOneForAdmin = async (req, res) => {
  try {
    const paper = await Research.findById(req.params.id).populate("submittedBy", "name email departmentName mobileNumber");
    if (!paper) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data: paper });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.duplicateCheck = async (req, res) => {
  try {
    const { title } = req.query;
    if (!title) return res.status(400).json({ success: false, message: "title query required" });

    const matches = await Research.find(
      { $text: { $search: title }, status: { $in: ["approved", "pending"] } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(5)
      .select("paperTitle fullName department status createdAt");

    res.status(200).json({ success: true, count: matches.length, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- Approve ----------
exports.approveResearch = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("name");

    const paper = await Research.findById(req.params.id);
    if (!paper) return res.status(404).json({ success: false, message: "Not found" });

    paper.status = "approved";
    paper.reviewedBy = req.user.id;
    paper.reviewedByName = admin?.name || "Admin";
    paper.reviewedAt = new Date();
    paper.rejectionReason = null;
    paper.changeRequestNote = null;
    paper.studentViewed = false; // 🆕 student কে notify করার জন্য unread mark

    await paper.save();
    res.status(200).json({ success: true, message: "Research approved and published", data: paper });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- Reject ----------
exports.rejectResearch = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: "Rejection reason is required" });

    const admin = await Admin.findById(req.user.id).select("name");
    const paper = await Research.findById(req.params.id);
    if (!paper) return res.status(404).json({ success: false, message: "Not found" });

    paper.status = "rejected";
    paper.rejectionReason = reason;
    paper.reviewedBy = req.user.id;
    paper.reviewedByName = admin?.name || "Admin";
    paper.reviewedAt = new Date();
    paper.studentViewed = false; // 🆕

    await paper.save();
    res.status(200).json({ success: true, message: "Research rejected", data: paper });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- Request changes ----------
exports.requestChanges = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ success: false, message: "Change note is required" });

    const admin = await Admin.findById(req.user.id).select("name");
    const paper = await Research.findById(req.params.id);
    if (!paper) return res.status(404).json({ success: false, message: "Not found" });

    paper.status = "changes_requested";
    paper.changeRequestNote = note;
    paper.reviewedBy = req.user.id;
    paper.reviewedByName = admin?.name || "Admin";
    paper.reviewedAt = new Date();
    paper.studentViewed = false; // 🆕

    await paper.save();
    res.status(200).json({ success: true, message: "Change request sent to applicant", data: paper });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addInternalNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ success: false, message: "Note text is required" });

    const admin = await Admin.findById(req.user.id).select("name");
    const paper = await Research.findById(req.params.id);
    if (!paper) return res.status(404).json({ success: false, message: "Not found" });

    paper.internalNotes.push({
      note,
      addedBy: req.user.id,
      addedByName: admin?.name || "Admin",
    });

    await paper.save();
    res.status(200).json({ success: true, message: "Note added", data: paper.internalNotes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};