const Student = require('../models/Student');
const bcrypt = require('bcrypt');
const sendEmail = require("../utils/sendEmail");
const Bus = require('../models/Bus');

const moment = require('moment');



// exports.registerStudent = async (req, res) => {
//   try {
//     const { name, email, password, departmentName, mobileNumber } = req.body;

//     const existingStudent = await Student.findOne({ email });

//     if (existingStudent) {
//       return res.status(400).json({
//         success: false,
//         message: "Email already registered"
//       });
//     }
//     const hashedPassword = await bcrypt.hash(password, 10);

// console.log(hashedPassword);

//     // create student with OTP
//     const student = await Student.create({
//       name,
//       email,
//       password: hashedPassword,
//       departmentName,
//       mobileNumber
//     });


//     res.status(201).json({
//       success: true,
//       message: "Registation successfully "
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };



// exports.registerStudent = async (req, res) => {
//   try {
//     const { name, email, password, departmentName, mobileNumber } = req.body;

//     const existingStudent = await Student.findOne({ email: email.trim().toLowerCase() });
//     if (existingStudent) {
//       return res.status(400).json({ success: false, message: "Email already registered" });
//     }

//     // পাসওয়ার্ড হ্যাশ করা
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password.trim(), salt);

//     const student = await Student.create({
//       name,
//       email: email.trim().toLowerCase(),
//       password: hashedPassword,
//       departmentName,
//       mobileNumber
//     });

//     res.status(201).json({ success: true, message: "Registration successful" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };



exports.registerStudent = async (req, res) => {
  try {
    const { name, email, password, departmentName, mobileNumber } = req.body;

    // 🔹 Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    // 🔹 Check existing student
    const existingStudent = await Student.findOne({ email });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    // 🔹 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(hashedPassword);

    // 🔹 Create student
    const student = await Student.create({
      name,
      email,
      password: hashedPassword,
      departmentName,
      mobileNumber
    });

    res.status(201).json({
      success: true,
      message: "Registration successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};