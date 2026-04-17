const express = require("express");
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');

const { createNotice, getAllNotices, getNoticeById, updateNotice, deleteNotice } = require("../../controllers/notice.controller");





router.post("/create-notice",authMiddleware(['super_admin', 'sub_admin']),createNotice);
router.get("/all-notice",getAllNotices);
router.get("/single-notice/:id", getNoticeById);
router.put("/updated-notice/:id",authMiddleware(['super_admin', 'sub_admin']),updateNotice);
router.delete("/:id",authMiddleware(['super_admin', 'sub_admin']),deleteNotice);

module.exports = router;