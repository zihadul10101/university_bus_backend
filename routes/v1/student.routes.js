const router = require('express').Router();

const studentController = require("../../controllers/student.controller");
const authMiddleware = require('../../middleware/auth.middleware');



router.post("/register", studentController.registerStudent);

module.exports = router;
