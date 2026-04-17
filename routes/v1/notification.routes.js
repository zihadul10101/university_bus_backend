const router = require('express').Router();
const authMiddleware = require('../../middleware/auth.middleware');
const { sendToUser, sendToAll, saveToken, sendToAllUsers } = require("../../controllers/notification.controller");


router.post("/send-user", authMiddleware(['super_admin', 'sub_admin']),sendToUser);
router.post("/send-all",authMiddleware(['super_admin', 'sub_admin']), sendToAllUsers);
router.post("/save-token",authMiddleware(['super_admin', 'sub_admin']), saveToken);

module.exports = router;