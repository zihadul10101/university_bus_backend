const router = require("express").Router();
const authMiddleware = require("../../middleware/auth.middleware");
const {
  login,
  verifyOtp,
  forgotPassword,
  resetPassword,
  getMe
} = require("../../controllers/auth.controller");


router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/me", authMiddleware,getMe);

module.exports = router;

