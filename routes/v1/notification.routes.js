const router = require('express').Router();
const authMiddleware = require('../../middleware/auth.middleware');
const { sendToUser, getNotifications, markAsRead } = require("../../controllers/notification.controller");


router.post("/send-user", authMiddleware(['super_admin', 'sub_admin']),sendToUser);
router.patch("/mark-read/:id", authMiddleware(['student', 'super_admin']), markAsRead);
router.get("/list", authMiddleware(['student', 'super_admin', 'sub_admin']), getNotifications);


module.exports = router;