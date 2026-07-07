// const mongoose = require("mongoose");

// const noteSchema = new mongoose.Schema(
//   {
//     note: { type: String, required: true },
//     addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
//     addedByName: String,
//     createdAt: { type: Date, default: Date.now },
//   },
//   { _id: false }
// );

// const researchSchema = new mongoose.Schema(
//   {
//     // ---------- Basic Information (Auto, from Student profile) ----------
//     submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
//     fullName: { type: String, required: true },
//     department: { type: String, required: true }, // Student.departmentName থেকে আসবে

//     // ---------- Research Information ----------
//     paperTitle: { type: String, required: true, trim: true },
//     authors: [{ type: String, trim: true }],
//     journalName: { type: String, required: true, trim: true },
//     publicationYear: { type: Number, required: true },
//     paperLink: { type: String, required: true, trim: true },
//     indexing: {
//       type: String,
//       enum: ["Scopus", "Web of Science", "Other", "Not Sure"],
//       default: "Not Sure",
//     },
//     keywords: [{ type: String, trim: true }],
//     verificationDocument: { type: String, default: null },

//     // ---------- Declaration ----------
//     declaration: { type: Boolean, required: true },

//     // ---------- Workflow / Status ----------
//     status: {
//       type: String,
//       enum: ["draft", "pending", "approved", "rejected", "changes_requested"],
//       default: "pending",
//     },
//     studentViewed: {type: Boolean},
//     rejectionReason: { type: String, default: null },
//     changeRequestNote: { type: String, default: null },
//     internalNotes: [noteSchema],

//     reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
//     reviewedByName: { type: String, default: null },
//     reviewedAt: { type: Date, default: null },

//     isDuplicate: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// researchSchema.index({ paperTitle: "text", journalName: "text", keywords: "text" });
// researchSchema.index({ status: 1, department: 1, publicationYear: -1 });

// module.exports = mongoose.model("Research", researchSchema);

const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    addedByName: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const researchSchema = new mongoose.Schema(
  {
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    fullName: { type: String, required: true },
    department: { type: String, required: true },

    paperTitle: { type: String, required: true, trim: true },
    authors: [{ type: String, trim: true }],
    journalName: { type: String, required: true, trim: true },
    publicationYear: { type: Number, required: true },
    paperLink: { type: String, required: true, trim: true },
    indexing: {
      type: String,
      enum: ["Scopus", "Web of Science", "Other", "Not Sure"],
      default: "Not Sure",
    },
    keywords: [{ type: String, trim: true }],
    verificationDocument: { type: String, default: null },

    declaration: { type: Boolean, required: true },

    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "changes_requested"],
      default: "pending",
    },
    rejectionReason: { type: String, default: null },
    changeRequestNote: { type: String, default: null },
    internalNotes: [noteSchema],

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    reviewedByName: { type: String, default: null },
    reviewedAt: { type: Date, default: null },

    isDuplicate: { type: Boolean, default: false },

    // 🆕 Student এই status update টা দেখেছে কিনা
    studentViewed: { type: Boolean, default: true },
  },
  { timestamps: true }
);

researchSchema.index({ paperTitle: "text", journalName: "text", keywords: "text" });
researchSchema.index({ status: 1, department: 1, publicationYear: -1 });
researchSchema.index({ submittedBy: 1, studentViewed: 1 }); // 🆕 unread count query ফাস্ট করার জন্য

module.exports = mongoose.model("Research", researchSchema);