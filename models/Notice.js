// const mongoose = require("mongoose");

// const NoticeSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true
//   },

//   message: {
//     type: String,
//     required: true
//   },

//   type: {
//     type: String,
//     enum: ["general", "emergency"],
//     default: "general"
//   },

//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Admin",
//     required: true
//   },

//   isDeleted: {
//     type: Boolean,
//     default: false
//   }

// }, { timestamps: true });

// module.exports = mongoose.model("Notice", NoticeSchema);


const mongoose = require("mongoose");

const NoticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Notice title is required"],
    trim: true
  },

  message: {
    type: String,
    required: [true, "Notice body message is required"],
    trim: true
  },

  type: {
    type: String,
    // 🎯 ফ্রন্টএন্ডের ড্রপডাউন/ব্যাজের সাথে হুবহু মিল রেখে enum আপডেট করা হলো
    enum: ["General", "Student", "Driver", "Urgent"],
    default: "General"
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin", // আপনার অ্যাডমিন মডেলের নাম
    required: true
  },

  isDeleted: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

// 🔍 কোয়েরি করার সময় যাতে অলরেডি ডিলিট হওয়া নোটিশগুলো অটোমেটিক বাদ পড়ে যায় (Global Safe Filter)
// 🚨 আপনার ব্যাকএন্ড স্কিমার এই কোডটিতেই বাগটি আছে:
NoticeSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

module.exports = mongoose.model("Notice", NoticeSchema);