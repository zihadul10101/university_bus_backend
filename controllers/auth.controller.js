const Admin = require("../models/Admin");
const Student = require("../models/Student");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

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

    await sendEmail(
      user.email,
      "Login OTP",
      `Your OTP is ${otp}. It will expire in 5 minutes.`
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


exports.verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    let user = await Admin.findById(userId);
    let role = "admin";

    if (!user) {
      user = await Student.findById(userId);
      role = "student";
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.otp !== Number(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP code" });
    }

    if (user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    user.otp = null;
    user.otpExpire = null;
    user.isVerified = true; 

    if (role === "student") {
      user.lastLogin = new Date();
    }

    await user.save();


    const token = jwt.sign(
      {
        id: user._id,
        role: role === "admin" ? user.role : "student", 
        permissions: user.permissions || []
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      message: "Verification & Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: role === "admin" ? user.role : "student"
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// exports.verifyOtp = async (req, res) => {
//   try {
//     const { userId, otp } = req.body;
//    console.log("userId",userId);

//     let user = await Admin.findById(userId);
//     let role = "admin";

//     if (!user) {
//       user = await Student.findById(userId);
//       role = "student";
//     } 
//     console.log("user",user);
    
//     if (!user || user.otp !== Number(otp) || user.otpExpire < Date.now()) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid or expired OTP"
//       });
//     }

//     user.otp = null;
//     user.otpExpire = null;

//     if (role === "student") {
//       user.lastLogin = new Date();
//     }

//     await user.save();

//     const token = jwt.sign(
//       {
//         id: user._id,
//         role: role === "admin" ? user.role : "student",
//         permissions: user.permissions || []
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "30d" }
//     );

//     res.json({
//       success: true,
//       message: "Login successful",
//       token
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

//VERIFY OTP
// exports.verifyOtp = async (req, res) => {
//   try {
//     const { userId, otp } = req.body;
//     //console.log("user id ",userId);
//     //console.log("otp ",otp);

//     const admin = await Admin.findById(userId);

//     if (!admin || admin.otp !== Number(otp))
//       return res.status(400).json({ message: "Invalid OTP" });

//     if (admin.otpExpire < Date.now())
//       return res.status(400).json({ message: "OTP expired" });

//     admin.otp = null;
//     admin.otpExpire = null;
//     await admin.save();

//     const token = jwt.sign(
//       {
//         id: admin._id,
//         role: admin.role,
//         permissions: admin.permissions
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "30d" }
//     );

//     res.json({ token });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(400).json({ message: "Email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);

    admin.otp = otp;
    admin.otpExpire = Date.now() + 5 * 60 * 1000;
    await admin.save();

    await sendEmail(
      admin.email,
      "Password Reset OTP",
      `Your OTP is ${otp}.`
    );

    res.json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin || admin.otp !== Number(otp))
      return res.status(400).json({ message: "Invalid OTP" });

    if (admin.otpExpire < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    admin.password = hashedPassword;
    admin.otp = null;
    admin.otpExpire = null;

    await admin.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
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