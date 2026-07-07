// const Notice = require("../models/Notice");
// const mongoose = require("mongoose");


// // ✅ Create Notice
// exports.createNotice = async (req, res) => {
//   try {
//     const { title, message, type } = req.body;

//     const notice = await Notice.create({
//       title,
//       message,
//       type,
//       createdBy: req.user.id
//     });

//     res.status(201).json({
//       success: true,
//       message: "Notice created successfully",
//       data: notice
//     });

//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


// // ✅ Get All Notices (Everyone)
// exports.getAllNotices = async (req, res) => {
//   try {
//     const notices = await Notice.find({ isDeleted: false })
//       .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       total: notices.length,
//       data: notices
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// // ✅ Get Single Notice
// exports.getNoticeById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: "Invalid Notice ID" });
//     }

//     const notice = await Notice.findOne({ _id: id, isDeleted: false });

//     if (!notice) {
//       return res.status(404).json({ message: "Notice not found" });
//     }

//     res.json({
//       success: true,
//       data: notice
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// // ✅ Update Notice (Admin only)
// exports.updateNotice = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const notice = await Notice.findOneAndUpdate(
//       { _id: id, isDeleted: false },
//       req.body,
//       { new: true }
//     );

//     if (!notice) {
//       return res.status(404).json({ message: "Notice not found" });
//     }

//     res.json({
//       success: true,
//       message: "Notice updated successfully",
//       data: notice
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// // ✅ Delete Notice (Soft Delete)
// exports.deleteNotice = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const notice = await Notice.findOneAndUpdate(
//       { _id: id },
//       { isDeleted: true },
//       { new: true }
//     );

//     if (!notice) {
//       return res.status(404).json({ message: "Notice not found" });
//     }

//     res.json({
//       success: true,
//       message: "Notice deleted successfully"
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

const Notice = require("../models/Notice");
const mongoose = require("mongoose");

// ✅ Create Notice
exports.createNotice = async (req, res) => {
  try {
    const { title, message, type } = req.body;

    // সিম্পল ইনপুট ভ্যালিডেশন সেফগার্ড
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required" });
    }

    const notice = await Notice.create({
      title,
      message,
      type: type || "General", // টাইপ না দিলে ডিফল্ট 'General' সেট হবে
      createdBy: req.user.id // authMiddleware থেকে আসা ইউজারের আইডি
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

// ✅ Get All Notices (Active and Sorted)
exports.getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.find({ isDeleted: false })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: notices.length,
      data: notices
    });

  } catch (err) {
    // 🎯 success: false যোগ করা হলো
    res.status(500).json({ success: false, message: err.message }); 
  }
};



exports.getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;

    // 🎯 চেক ১: আইডি যদি মঙ্গোডিবি অবজেক্ট আইডি ফরমেটের সাথে না মেলে
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid Notice ID format" 
      });
    }

    // 🎯 চেক ২: ডাটাবেজ কোয়েরি (নিশ্চিত করুন গ্লোবাল ফিল্টার যেন একটিভ ডাটাকে ব্লক না করে)
    const notice = await Notice.findById(id);
    
    // অথবা যদি সফট ডিলিট ট্রিক ব্যবহার করেন:
    // const notice = await Notice.findOne({ _id: id, isDeleted: { $ne: true } });

    if (!notice) {
      return res.status(404).json({ 
        success: false, 
        message: "Notice not found" 
      });
    }

    // 🎯 সফল হলে রেসপন্স রিটার্ন
    res.status(200).json({
      success: true,
      data: notice
    });

  } catch (error) {
    console.error("Backend getNoticeById Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server internal error", 
      error: error.message 
    });
  }
};

// ✅ Update Notice (Admin only)
exports.updateNotice = async (req, res) => {
  try {
    const { id } = req.params;

    // 🎯 আইডি ভ্যালিডেশন যোগ করা হলো
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Notice ID" });
    }

    const notice = await Notice.findOneAndUpdate(
      { _id: id, isDeleted: false },
      req.body,
      { new: true, runValidators: true } // runValidators দিলে মডেল স্কিমার রুলস মেনে আপডেট হবে
    );

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    res.status(200).json({
      success: true,
      message: "Notice updated successfully",
      data: notice
    });

  } catch (err) {
    // 🎯 success: false যোগ করা হলো
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Delete Notice (Soft Delete)
exports.deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    // 🎯 আইডি ভ্যালিডেশন যোগ করা হলো
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Notice ID" });
    }

    const notice = await Notice.findOneAndUpdate(
      { _id: id, isDeleted: false }, // অলরেডি ডিলিট হওয়া নোটিশকে যেন আবার ডিলিট রিকোয়েস্ট না করা যায়
      { isDeleted: true },
      { new: true }
    );

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    res.status(200).json({
      success: true,
      message: "Notice deleted successfully"
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};