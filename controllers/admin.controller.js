const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const mongoose = require("mongoose");

// Create Sub Admin
// exports.createSubAdmin = async (req, res) => {
//   try {
//     const { name, email, password, permissions } = req.body;
//     const hashedPassword = await bcrypt.hash(password, 10);

//     const subAdmin = await Admin.create({
//       name,
//       email,
//       password: hashedPassword,
//       role: 'sub_admin',
//       permissions
//     });

//     res.status(201).json({ message: 'Sub Admin created', subAdmin });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

exports.createSubAdmin = async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;

    // ❌ Missing fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    // ❌ Check existing email
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const subAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      role: "sub_admin",
      permissions: permissions || {}
    });

    // ✅ Success
    return res.status(201).json({
      success: true,
      message: "Sub-admin created successfully",
      data: subAdmin
    });

  } catch (err) {
    // ❌ Error
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

// Get all Sub Admins

exports.getSubAdmins = async (req, res) => {
  try {
    const subs = await Admin.find({ role: 'sub_admin' });

    if (!subs || subs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No sub-admins found",
        data: []
      });
    }

    return res.status(200).json({
      success: true,
      message: "Sub-admins fetched successfully",
      count: subs.length,
      data: subs
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server Error"
    });
  }
};
// Update Sub Admin permissions


exports.updateSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, permissions } = req.body;

    // ❌ Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sub-admin ID"
      });
    }

    // ❌ Check if sub-admin exists
    const subAdmin = await Admin.findById(id);
    if (!subAdmin || subAdmin.role !== "sub_admin") {
      return res.status(404).json({
        success: false,
        message: "Sub-admin not found"
      });
    }

    // ✅ Update fields
    if (name) subAdmin.name = name;
    if (email) subAdmin.email = email;

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      subAdmin.password = hashed;
    }

    if (permissions) subAdmin.permissions = permissions;

    const updatedSubAdmin = await subAdmin.save();

    // Hide password in response
    updatedSubAdmin.password = undefined;

    return res.status(200).json({
      success: true,
      message: "Sub-admin updated successfully",
      data: updatedSubAdmin
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

// Delete Sub Admin
exports.deleteSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("idd",id);
    
    const sub = await Admin.findByIdAndDelete(id);
   console.log(sub);
   
    if (!sub) return res.status(404).json({ message: 'Sub Admin not found' });

    res.json({ message: 'Sub Admin deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


