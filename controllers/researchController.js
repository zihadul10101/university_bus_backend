const Research = require("../models/Research");
const Student = require("../models/Student");

// ---------- Submit new research ----------
exports.submitResearch = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("name departmentName");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const {
      paperTitle,
      authors,
      journalName,
      publicationYear,
      paperLink,
      indexing,
      keywords,
      declaration,
      isDraft,
    } = req.body;

    if (!declaration && isDraft !== true && isDraft !== "true") {
      return res.status(400).json({ success: false, message: "Declaration must be confirmed" });
    }

    const paper = await Research.create({
      submittedBy: student._id,
      fullName: student.name,
      department: student.departmentName,

      paperTitle,
      authors: Array.isArray(authors)
        ? authors
        : authors
        ? authors.split(",").map((a) => a.trim())
        : [],
      journalName,
      publicationYear,
      paperLink,
      indexing: indexing || "Not Sure",
      keywords: Array.isArray(keywords)
        ? keywords
        : keywords
        ? keywords.split(",").map((k) => k.trim())
        : [],
      verificationDocument: req.file ? req.file.path : null,
      declaration: !!declaration,
      status: isDraft === true || isDraft === "true" ? "draft" : "pending",
      studentViewed: true, // 🆕 নিজে সাবমিট করেছে, unread না
    });

    res.status(201).json({ success: true, message: "Research submitted successfully", data: paper });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateResearch = async (req, res) => {
  try {
    const paper = await Research.findById(req.params.id);
    if (!paper) return res.status(404).json({ success: false, message: "Not found" });

    if (String(paper.submittedBy) !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (!["draft", "pending", "changes_requested"].includes(paper.status)) {
      return res.status(400).json({ success: false, message: "Cannot edit an already reviewed paper" });
    }

    const fields = [
      "paperTitle",
      "authors",
      "journalName",
      "publicationYear",
      "paperLink",
      "indexing",
      "keywords",
      "declaration",
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) paper[f] = req.body[f];
    });

    if (req.file) paper.verificationDocument = req.file.path;

    if (paper.status === "changes_requested") {
      paper.status = "pending";
      paper.changeRequestNote = null;
    } else if (req.body.isDraft === false || req.body.isDraft === "false") {
      paper.status = "pending";
    }

    await paper.save();
    res.status(200).json({ success: true, message: "Updated successfully", data: paper });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { submittedBy: req.user.id };
    if (status) filter.status = status;

    const papers = await Research.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: papers.length, data: papers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMySubmissionById = async (req, res) => {
  try {
    const paper = await Research.findById(req.params.id);
    if (!paper) return res.status(404).json({ success: false, message: "Not found" });
    if (String(paper.submittedBy) !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    res.status(200).json({ success: true, data: paper });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteResearch = async (req, res) => {
  try {
    const paper = await Research.findById(req.params.id);
    if (!paper) return res.status(404).json({ success: false, message: "Not found" });

    if (String(paper.submittedBy) !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (paper.status !== "draft") {
      return res.status(400).json({ success: false, message: "Only drafts can be deleted" });
    }

    await paper.deleteOne();
    res.status(200).json({ success: true, message: "Draft deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- 🆕 Unread count (drawer badge-এর জন্য) ----------
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Research.countDocuments({
      submittedBy: req.user.id,
      studentViewed: false,
    });
    res.status(200).json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- 🆕 Mark all as viewed (My Research স্ক্রিনে ঢুকলে কল হবে) ----------
exports.markAllAsViewed = async (req, res) => {
  try {
    await Research.updateMany(
      { submittedBy: req.user.id, studentViewed: false },
      { $set: { studentViewed: true } }
    );
    res.status(200).json({ success: true, message: "Marked as viewed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};