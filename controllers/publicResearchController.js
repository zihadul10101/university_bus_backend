const Research = require("../models/Research");

const publicFields =
  "paperTitle fullName authors department journalName publicationYear paperLink indexing keywords createdAt";

// ---------- 1. All approved research (with filters + pagination) ----------
exports.getAllApproved = async (req, res) => {
  try {
    const { department, year, indexing, search, page = 1, limit = 20 } = req.query;
    const filter = { status: "approved" };

    if (department) filter.department = department;
    if (year) filter.publicationYear = Number(year);
    if (indexing) filter.indexing = indexing;
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);

    const [papers, total] = await Promise.all([
      Research.find(filter).select(publicFields).sort({ publicationYear: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
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

// ---------- 2. Single paper detail (public) ----------
exports.getOnePublic = async (req, res) => {
  try {
    const paper = await Research.findOne({ _id: req.params.id, status: "approved" }).select(publicFields);
    if (!paper) return res.status(404).json({ success: false, message: "Paper not found" });
    res.status(200).json({ success: true, data: paper });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- 3. Department-wise research ----------
exports.getDepartmentWise = async (req, res) => {
  try {
    const grouped = await Research.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          papers: {
            $push: {
              _id: "$_id",
              paperTitle: "$paperTitle",
              fullName: "$fullName",
              journalName: "$journalName",
              publicationYear: "$publicationYear",
              paperLink: "$paperLink",
              indexing: "$indexing",
            },
          },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          department: "$_id",
          _id: 0,
          count: 1,
          papers: { $slice: ["$papers", 5] }, // প্রতি ডিপার্টমেন্টে সাম্প্রতিক ৫টা
        },
      },
    ]);

    res.status(200).json({ success: true, count: grouped.length, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- 4. Top researchers (by publication count) ----------
exports.getTopResearchers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topResearchers = await Research.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: "$submittedBy",
          fullName: { $first: "$fullName" },
          department: { $first: "$department" },
          role: { $first: "$role" },
          publicationCount: { $sum: 1 },
          latestPaperTitle: { $last: "$paperTitle" },
        },
      },
      { $sort: { publicationCount: -1 } },
      { $limit: Number(limit) },
    ]);

    res.status(200).json({ success: true, count: topResearchers.length, data: topResearchers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- 5. Latest publications ----------
exports.getLatest = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const papers = await Research.find({ status: "approved" })
      .select(publicFields)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({ success: true, count: papers.length, data: papers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};