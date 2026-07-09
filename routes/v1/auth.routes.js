const router = require("express").Router();
const authMiddleware = require("../../middleware/auth.middleware");
const {
  login,
  forgotPassword,
  resetPassword,
  getMe
} = require("../../controllers/auth.controller");


router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authMiddleware(['super_admin', 'sub_admin','student',"driver"]),getMe);

module.exports = router;

