const router = require('express').Router();

const studentController = require("../../controllers/student.controller");
const authMiddleware = require('../../middleware/auth.middleware');



router.post("/register", studentController.registerStudent);
router.post("/verify-otp", studentController.verifyOtp);
router.post("/resend-otp", studentController.resendOtp);

module.exports = router;
