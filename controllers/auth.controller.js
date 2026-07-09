const Admin = require("../models/Admin");
const Student = require("../models/Student");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const generateToken = require("../utils/generateToken");
const Driver = require("../models/Driver");



// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     let user = await Admin.findOne({ email });
//     let finalRole = null;

//     if (user) {
//       finalRole = user.role; // super_admin or sub_admin
//     } else {
//       user = await Student.findOne({ email });

//     }

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid email",
//       });
//     }

//     const isMatch = await bcrypt.compare(
//       password.trim(),
//       user.password
//     );

//     if (!isMatch) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid password",
//       });
//     }

//     const token = jwt.sign(
//       {
//         id: user._id,
//         role: finalRole,
//       },
//       process.env.JWT_SECRET,
//       {
//         expiresIn: "7d",
//       }
//     );
   
    

//     // Remove sensitive fields
//     const userData = user.toObject();
//     delete userData.password;
//     delete userData.otp;
//     delete userData.otpExpire;

//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       token,
//       role: finalRole,
//       user: userData,
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await Admin.findOne({ email });
    let finalRole = null;

    if (user) {
      finalRole = user.role; // super_admin or sub_admin
    } else {
      user = await Student.findOne({ email });
      if (user) {
        finalRole = "student"; // 🆕 was missing — this is why student tokens had role: null
      }
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    const isMatch = await bcrypt.compare(
      password.trim(),
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: finalRole,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Remove sensitive fields
    const userData = user.toObject();
    delete userData.password;
    delete userData.otp;
    delete userData.otpExpire;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: finalRole,
      user: userData,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await Student.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    return res.status(200).json({ message: 'Email verified, proceed to reset password' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await Student.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
exports.getMe = async (req, res) => {
  try {
    const { id, role } = req.user;

    let user;

    // Admin (super_admin / sub_admin)
    if (role === "super_admin" || role === "sub_admin") {
      user = await Admin.findById(id)
        .select("-password -otp -otpExpire");
    }

    // Student
    else if (role === "student") {
      user = await Student.findById(id)
        .select("-password -otp -otpExpire");
    }

    // --- নতুন যোগ করা অংশ: Driver ---
    else if (role === "driver") {
      // আপনার ড্রাইভার মডেলের নাম (যেমন: Driver) ব্যবহার করুন
      user = await Driver.findById(id)
        .select("-password -otp -otpExpire");
    }

    // Not valid role
    else {
      return res.status(403).json({
        success: false,
        message: "Invalid role"
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      role,
      data: user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

