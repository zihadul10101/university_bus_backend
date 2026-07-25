// const Student = require('../models/Student');
// const bcrypt = require('bcrypt');
// const sendEmail = require("../utils/sendEmail");
// const Bus = require('../models/Bus');

// const moment = require('moment');



// // exports.registerStudent = async (req, res) => {
// //   try {
// //     const { name, email, password, departmentName, mobileNumber } = req.body;

// //     const existingStudent = await Student.findOne({ email });

// //     if (existingStudent) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Email already registered"
// //       });
// //     }
// //     const hashedPassword = await bcrypt.hash(password, 10);

// // console.log(hashedPassword);

// //     // create student with OTP
// //     const student = await Student.create({
// //       name,
// //       email,
// //       password: hashedPassword,
// //       departmentName,
// //       mobileNumber
// //     });


// //     res.status(201).json({
// //       success: true,
// //       message: "Registation successfully "
// //     });

// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       message: error.message
// //     });
// //   }
// // };



// // exports.registerStudent = async (req, res) => {
// //   try {
// //     const { name, email, password, departmentName, mobileNumber } = req.body;

// //     const existingStudent = await Student.findOne({ email: email.trim().toLowerCase() });
// //     if (existingStudent) {
// //       return res.status(400).json({ success: false, message: "Email already registered" });
// //     }

// //     // পাসওয়ার্ড হ্যাশ করা
// //     const salt = await bcrypt.genSalt(10);
// //     const hashedPassword = await bcrypt.hash(password.trim(), salt);

// //     const student = await Student.create({
// //       name,
// //       email: email.trim().toLowerCase(),
// //       password: hashedPassword,
// //       departmentName,
// //       mobileNumber
// //     });

// //     res.status(201).json({ success: true, message: "Registration successful" });
// //   } catch (error) {
// //     res.status(500).json({ success: false, message: error.message });
// //   }
// // };



// exports.registerStudent = async (req, res) => {
//   try {
//     const { name, email, password, departmentName, mobileNumber } = req.body;

//     // 🔹 Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//     if (!emailRegex.test(email)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid email format"
//       });
//     }

//     // 🔹 Check existing student
//     const existingStudent = await Student.findOne({ email });

//     if (existingStudent) {
//       return res.status(400).json({
//         success: false,
//         message: "Email already registered"
//       });
//     }

//     // 🔹 Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     console.log(hashedPassword);

//     // 🔹 Create student
//     const student = await Student.create({
//       name,
//       email,
//       password: hashedPassword,
//       departmentName,
//       mobileNumber
//     });

//     res.status(201).json({
//       success: true,
//       message: "Registration successfully"
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };



const bcrypt = require('bcrypt');
const Student = require('../models/Student'); // path আপনার প্রজেক্ট অনুযায়ী ঠিক করে নিন
const sendEmail = require('../utils/sendEmail'); // আপনার existing util

// ---------- OTP Email Template ----------
const buildOtpEmail = (otp, title = "UniBus Verification") => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
    <div style="background-color: #007AFF; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
    </div>
    <div style="padding: 30px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #555;">আপনার UniBus account ভেরিফাই করার জন্য One-Time Password (OTP):</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #007AFF; letter-spacing: 8px; border: 2px dashed #007AFF; padding: 10px 20px; border-radius: 8px; background-color: #f0f7ff;">
                ${otp}
            </span>
        </div>
        <p style="font-size: 14px; color: #888; text-align: center;">
            এই OTP <strong>৫ মিনিট</strong> পর্যন্ত বৈধ থাকবে। কারো সাথে শেয়ার করবেন না।
        </p>
    </div>
    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #eeeeee;">
        <p style="font-size: 12px; color: #aaa; margin: 0;">
            &copy; 2026 UniBus System | Southern University Bangladesh
        </p>
    </div>
</div>
`;

// ---------- Register ----------
exports.registerStudent = async (req, res) => {
  try {
    const { name, studentId, email, password, departmentName } = req.body;

    // 🔹 Required field check
    if (!name || !studentId || !email || !password || !departmentName) {
      return res.status(400).json({
        success: false,
        message: "সব ফিল্ড পূরণ করুন"
      });
    }

    // 🔹 Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "সঠিক ইমেইল ফরম্যাট দিন"
      });
    }

    // 🔹 Student ID format validation: প্রতিটা group max 3 digit (e.g. 666-60-09, 666-112-245)
    const studentIdRegex = /^\d{1,3}-\d{1,3}-\d{1,3}$/;
    if (!studentIdRegex.test(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Student ID ফরম্যাট ভুল — প্রতিটা অংশে সর্বোচ্চ ৩ ডিজিট হতে পারে (যেমন: 666-60-09 অথবা 666-112-245)"
      });
    }

    // 🔹 Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "পাসওয়ার্ড অবশ্যই ৬ ক্যারেক্টারের বেশি হতে হবে, ১টি বড় হাতের, ১টি ছোট হাতের ও ১টি স্পেশাল ক্যারেক্টার থাকতে হবে"
      });
    }

    // 🔹 Duplicate check (email + studentId)
    const existingStudent = await Student.findOne({
      $or: [{ email: email.toLowerCase() }, { studentId }]
    });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: existingStudent.email === email.toLowerCase()
          ? "এই ইমেইল দিয়ে আগে থেকেই একাউন্ট আছে"
          : "এই Student ID দিয়ে আগে থেকেই একাউন্ট আছে"
      });
    }

    // 🔹 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpire = Date.now() + 5 * 60 * 1000;

    // 🔹 Create student (unverified)
    const student = await Student.create({
      name,
      studentId,
      email: email.toLowerCase(),
      password: hashedPassword,
      departmentName,
      isVerified: false,
      otp,
      otpExpire,
    });

    // 🔹 আগে response পাঠান — client কে email পাঠানোর জন্য অপেক্ষা করাবেন না
    res.status(201).json({
      success: true,
      message: "রেজিস্ট্রেশন সফল হয়েছে। আপনার ইমেইলে OTP পাঠানো হচ্ছে।",
      userId: student._id,
      email: student.email,
    });

    // 🔹 Email background এ পাঠান (fire-and-forget) — response আটকাবে না
    sendEmail(student.email, "UniBus Email Verification", buildOtpEmail(otp))
      .then(() => console.log("✅ OTP email sent to:", student.email))
      .catch((emailError) => console.error("❌ Email send failed:", emailError.message));

  } catch (error) {
    console.error("❌ Register error:", error.message);
    // headers আগে থেকে পাঠানো না থাকলেই শুধু error response পাঠানো নিরাপদ
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

// ---------- Verify OTP ----------
exports.verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: "userId ও OTP দিন" });
    }

    const student = await Student.findById(userId);
    if (!student) {
      return res.status(404).json({ success: false, message: "ইউজার পাওয়া যায়নি" });
    }

    if (student.isVerified) {
      return res.status(400).json({ success: false, message: "একাউন্ট আগে থেকেই ভেরিফাইড" });
    }

    if (!student.otp || !student.otpExpire || Date.now() > student.otpExpire) {
      return res.status(400).json({ success: false, message: "OTP এর মেয়াদ শেষ। নতুন কোড পাঠান।" });
    }

    if (parseInt(otp) !== student.otp) {
      return res.status(400).json({ success: false, message: "ভুল OTP" });
    }

    student.isVerified = true;
    student.otp = undefined;
    student.otpExpire = undefined;
    await student.save();

    res.json({ success: true, message: "ইমেইল সফলভাবে ভেরিফাই হয়েছে" });

  } catch (error) {
    console.error("❌ Verify OTP error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- Resend OTP ----------
exports.resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId দিন" });
    }

    const student = await Student.findById(userId);
    if (!student) {
      return res.status(404).json({ success: false, message: "ইউজার পাওয়া যায়নি" });
    }

    if (student.isVerified) {
      return res.status(400).json({ success: false, message: "একাউন্ট আগে থেকেই ভেরিফাইড" });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000);
    student.otp = newOtp;
    student.otpExpire = Date.now() + 5 * 60 * 1000;
    await student.save();

    // 🔹 আগে response পাঠান
    res.json({ success: true, message: "নতুন OTP আপনার ইমেইলে পাঠানো হচ্ছে" });

    // 🔹 Email background এ পাঠান
    sendEmail(student.email, "UniBus New Verification OTP", buildOtpEmail(newOtp))
      .then(() => console.log("✅ Resend OTP email sent to:", student.email))
      .catch((emailError) => console.error("❌ Resend email failed:", emailError.message));

  } catch (error) {
    console.error("❌ Resend OTP error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};