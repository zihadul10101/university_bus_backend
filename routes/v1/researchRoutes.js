
const router = require('express').Router();
const authMiddleware = require('../../middleware/auth.middleware');
const upload = require("../../middleware/researchUpload");

const userCtrl = require("../../controllers/researchController");
const adminCtrl = require("../../controllers/adminResearchController");
const publicCtrl = require("../../controllers/publicResearchController");

// ============ PUBLIC ROUTES ============
router.get("/", publicCtrl.getAllApproved);
router.get("/department-wise", publicCtrl.getDepartmentWise);
router.get("/top-researchers", publicCtrl.getTopResearchers);
router.get("/latest", publicCtrl.getLatest);

// ============ STUDENT ROUTES ============
router.post(
  "/submit",
  authMiddleware(["student"]),
  upload.single("verificationDocument"),
  userCtrl.submitResearch
);
router.put(
  "/:id",
  authMiddleware(["student"]),
  upload.single("verificationDocument"),
  userCtrl.updateResearch
);
router.get("/my/submissions", authMiddleware(["student"]), userCtrl.getMySubmissions);
router.get("/my/submissions/:id", authMiddleware(["student"]), userCtrl.getMySubmissionById);
router.delete("/:id", authMiddleware(["student"]), userCtrl.deleteResearch);

// 🆕 Unread badge count + mark-as-viewed
router.get("/my/unread-count", authMiddleware(["student"]), userCtrl.getUnreadCount);
router.patch("/my/mark-viewed", authMiddleware(["student"]), userCtrl.markAllAsViewed);

// ============ ADMIN ROUTES ============
router.get("/admin/all", authMiddleware(['super_admin', 'sub_admin']), adminCtrl.getAllForAdmin);
router.get("/admin/duplicate-check", authMiddleware(['super_admin', 'sub_admin']), adminCtrl.duplicateCheck);
router.get("/admin/:id", authMiddleware(['super_admin', 'sub_admin']), adminCtrl.getOneForAdmin);
router.patch("/admin/:id/approve", authMiddleware(['super_admin', 'sub_admin']), adminCtrl.approveResearch);
router.patch("/admin/:id/reject", authMiddleware(['super_admin', 'sub_admin']), adminCtrl.rejectResearch);
router.patch("/admin/:id/request-changes", authMiddleware(['super_admin', 'sub_admin']), adminCtrl.requestChanges);
router.post("/admin/:id/notes", authMiddleware(['super_admin', 'sub_admin']), adminCtrl.addInternalNote);

// পাবলিক single-paper route সবার শেষে
router.get("/:id", publicCtrl.getOnePublic);

module.exports = router;