const Student = require('../models/Student');
// const bcrypt = require("bcrypt");
const bcrypt = require('bcryptjs');
const sendEmail = require("../utils/sendEmail");
const Bus = require('../models/Bus');

const moment = require('moment');



exports.registerStudent = async (req, res) => {
  try {
    const { name, email, password, departmentName, mobileNumber } = req.body;

    const existingStudent = await Student.findOne({ email });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create student with OTP
    const student = await Student.create({
      name,
      email,
      password: hashedPassword,
      departmentName,
      mobileNumber
    });


    res.status(201).json({
      success: true,
      message: "Registation successfully "
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};





