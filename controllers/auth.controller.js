const Admin = require("../models/Admin");
const Student = require("../models/Student");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const generateToken = require("../utils/generateToken");

// LOGIN


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    //  console.log(email,password);

    let user = await Admin.findOne({ email });


    let role = "admin";

    if (!user) {
      user = await Student.findOne({ email });
      role = "student";
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email"
      });
    }


    const cleanPassword = password.trim();
    const isMatch = await bcrypt.compare(cleanPassword, user.password);




    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password"
      });
    }

    // Generate OTP for both admin and student
    const otp = Math.floor(100000 + Math.random() * 900000);

    user.otp = otp;
    user.otpExpire = Date.now() + 5 * 60 * 1000;
    await user.save();

    const emailTemplate = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
    <div style="background-color: #007AFF; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">UniBus Verification</h1>
    </div>
    <div style="padding: 30px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #555;">Your one-time password (OTP) for logging into your UniBus account is:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #007AFF; letter-spacing: 8px; border: 2px dashed #007AFF; padding: 10px 20px; border-radius: 8px; background-color: #f0f7ff;">
                ${otp}
            </span>
        </div>
        
        <p style="font-size: 14px; color: #888; text-align: center;">
            This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.
        </p>
    </div>
    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #eeeeee;">
        <p style="font-size: 12px; color: #aaa; margin: 0;">
            &copy; 2026 UniBus System | Southern University Bangladesh
        </p>
    </div>
</div>
`;

    await sendEmail(
      user.email,
      "UniBus Login OTP",
      emailTemplate
    );
    res.json({
      success: true,
      message: "OTP sent to your email",
      userId: user._id,
      role
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.resendOtp = async (req, res) => {
  const { userId } = req.body;
  const user = await Student.findById(userId) || await Admin.findById(userId);

  if (!user) return res.status(404).json({ message: "User not found" });

  const newOtp = Math.floor(100000 + Math.random() * 900000);
  user.otp = newOtp;
  user.otpExpire = Date.now() + 5 * 60 * 1000;
  await user.save();
  const emailTemplate = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
    <div style="background-color: #007AFF; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">UniBus Verification</h1>
    </div>
    <div style="padding: 30px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #555;">Your New one-time password (OTP) for logging into your UniBus account is:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #007AFF; letter-spacing: 8px; border: 2px dashed #007AFF; padding: 10px 20px; border-radius: 8px; background-color: #f0f7ff;">
                ${newOtp}
            </span>
        </div>
        
        <p style="font-size: 14px; color: #888; text-align: center;">
            This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.
        </p>
    </div>
    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #eeeeee;">
        <p style="font-size: 12px; color: #aaa; margin: 0;">
            &copy; 2026 UniBus System | Southern University Bangladesh
        </p>
    </div>
</div>
`;

  await sendEmail(
    user.email,
    "UniBus New Login OTP",
    emailTemplate
  );
  // await sendEmail(user.email, "Your New OTP", `<h1>Code: ${newOtp}</h1>`);

  res.json({ success: true, message: "New OTP sent to your email" });
};

exports.verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    let user = await Admin.findById(userId);
    let userRole = "";

    if (user) {
      userRole = user.role;
    } else {
      user = await Student.findById(userId);
      userRole = user ? (user.role || 'student') : null;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.otp != otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP code" });
    }

    if (user.otpExpire && user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    const token = generateToken({ id: user._id, role: userRole });

    user.otp = null;
    user.otpExpire = null;
    await user.save();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: userRole,
        department: user.departmentName || null,
        mobile: user.mobileNumber || null,
        permissions: user.permissions || null,
        isActive: user.isActive,
        joinedAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;


    let user = await Admin.findOne({ email });
    let role = 'admin';


    if (!user) {
      user = await Student.findOne({ email });
      role = 'student';
    }


    if (!user) {
      return res.status(400).json({ message: "Email not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    user.otp = otp;
    user.otpExpire = Date.now() + 5 * 60 * 1000;
    await user.save();
    const emailTemplate = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
    <div style="background-color: #007AFF; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">UniBus Verification</h1>
    </div>
    <div style="padding: 30px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #555;">Your Reset Password OTP  for logging into your UniBus account is:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #007AFF; letter-spacing: 8px; border: 2px dashed #007AFF; padding: 10px 20px; border-radius: 8px; background-color: #f0f7ff;">
                ${otp}
            </span>
        </div>
        
        <p style="font-size: 14px; color: #888; text-align: center;">
            This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.
        </p>
    </div>
    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #eeeeee;">
        <p style="font-size: 12px; color: #aaa; margin: 0;">
            &copy; 2026 UniBus System | Southern University Bangladesh
        </p>
    </div>
</div>
`;

    await sendEmail(
      user.email,
      "Password Reset OTP",
      emailTemplate
    );


    res.json({
      success: true,
      message: "OTP sent to email",
      userId: user._id,
      role: role
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { userId, role, password } = req.body;


    const Model = (role === 'admin') ? Admin : Student;


    const user = await Model.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully! You can now login with your new password."
    });

  } catch (error) {
    console.error("Bcrypt Reset Error:", error);
    res.status(500).json({ success: false, message: error.message });
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