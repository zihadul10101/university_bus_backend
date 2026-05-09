const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");



// exports.createDriver = async (req, res) => {
//   try {
//     const { name, mobile, licenseNumber, loginName, password } = req.body;

//     // ✅ Check duplicates
//     const existingDriver = await Driver.findOne({
//       $or: [{ mobile }, { licenseNumber }, { loginName }]
//     });

//     if (existingDriver) {
//       const duplicateField =
//         existingDriver.mobile === mobile
//           ? "mobile"
//           : existingDriver.licenseNumber === licenseNumber
//           ? "licenseNumber"
//           : "loginName";

//       return res.status(400).json({
//         success: false,
//         message: `Duplicate value for field: ${duplicateField}`,
//         field: duplicateField,
//         value: req.body[duplicateField]
//       });
//     }

//     // 🔐 Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // ✅ Create driver
//     const driver = await Driver.create({
//       name,
//       mobile,
//       licenseNumber,
//       loginName,
//       password: hashedPassword,
//       // busId: bus._id,
//       createdBy: req.user.id
//     });

//     // Hide password in response
//     driver.password = undefined;

//     return res.status(201).json({
//       success: true,
//       message: "Driver created successfully",
//       data: driver
//     });

//   } catch (err) {
//     // Validation errors
//     if (err.name === "ValidationError") {
//       const errors = Object.values(err.errors).map(e => e.message);
//       return res.status(400).json({
//         success: false,
//         message: "Validation Error",
//         errors
//       });
//     }

//     // Generic error
//     return res.status(500).json({
//       success: false,
//       message: err.message || "Server error"
//     });
//   }
// };


exports.createDriver = async (req, res) => {
  try {
    const { name, mobile, licenseNumber, loginName, password } = req.body;

    // ✅ ডুপ্লিকেট চেক (আপনার আগের লজিক ঠিক আছে)
    const existingDriver = await Driver.findOne({
      $or: [{ mobile }, { licenseNumber }, { loginName }]
    });

    if (existingDriver) {
      // ... আপনার এরর হ্যান্ডলিং লজিক
      return res.status(400).json({ success: false, message: "Duplicate value detected" });
    }

    // 🔐 পাসওয়ার্ড হ্যাশ করা
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ ড্রাইভার তৈরি (রোল অটোমেটিক 'driver' হিসেবে সেট হবে)
    const driver = await Driver.create({
      name,
      mobile,
      licenseNumber,
      loginName,
      password: hashedPassword,
      role: "driver", // ম্যানুয়ালি নিশ্চিত করার জন্য দিতে পারেন
      createdBy: req.user.id
    });

    driver.password = undefined; // রেসপন্স থেকে পাসওয়ার্ড হাইড করা

    return res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: driver
    });

  } catch (err) {
    // ... আপনার এরর হ্যান্ডলিং
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver || driver.isDeleted) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // ✅ safe check
    if (
      req.user.role === 'sub_admin' &&
      driver.createdBy &&
      driver.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: "You can only update your own drivers"
      });
    }

    const { name, mobile, licenseNumber, busId } = req.body;

    if (name) driver.name = name;
    if (mobile) driver.mobile = mobile;
    if (licenseNumber) driver.licenseNumber = licenseNumber;
    if (busId) driver.busId = busId; // ✅ FIX (bus না, busId)

    await driver.save();

    res.json({
      success: true,
      message: "Driver updated successfully",
      data: driver
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete driver (soft delete)
exports.deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    console.log("driver",driver)
    if (!driver || driver.isDeleted) return res.status(404).json({ message: "Driver not found" });

    driver.isDeleted = true;

    await driver.save();

    res.json({ message: "Driver deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({ isDeleted: false })
      .populate("busId", "busNo busName");

    // ⚠️ No drivers found
    if (!drivers || drivers.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No drivers found",
        totalDrivers: 0,
        data: []
      });
    }

    // ✅ Success
    return res.status(200).json({
      success: true,
      message: "Drivers fetched successfully",
      totalDrivers: drivers.length,
      data: drivers
    });

  } catch (err) {
    // ❌ Error
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};


// exports.driverLogin = async (req, res) => {
//   try {
//     const { loginName, password } = req.body;
//     console.log(loginName);
    
//     // ❌ Missing fields
//     if (!loginName || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Login name and password are required"
//       });
//     }

//     // ✅ Find driver + populate bus
//     const driver = await Driver.findOne({
//       loginName
//     });
//      console.log("driver",driver);
  
//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: "Driver not found"
//       });
//     }

//     // ❌ Invalid password
//     const valid = await bcrypt.compare(password, driver.password);
//     if (!valid) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid password"
//       });
//     }

//     // ✅ Set online
//     driver.isOnline = true;
//     await driver.save();

//     // 🔐 Generate token
//     const token = jwt.sign(
//       { id: driver._id, role: "driver" },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     // Hide password
//     driver.password = undefined;

//     // ✅ Success
//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       token,
//       data: {
//         id: driver._id,
//         name: driver.name,
//         mobile: driver.mobile,
//         licenseNumber: driver.licenseNumber,
//         isOnline: driver.isOnline,
//         bus: driver.busId // ✅ fixed (was driver.bus)
//       }
//     });

//   } catch (err) {
//     // ❌ Error
//     return res.status(500).json({
//       success: false,
//       message: err.message || "Server error"
//     });
//   }
// };



exports.driverLogin = async (req, res) => {
  try {
    const { loginName, password } = req.body;

    // ❌ Missing fields
    if (!loginName || !password) {
      return res.status(400).json({
        success: false,
        message: "Login name and password are required"
      });
    }

    // ✅ Find driver (populate busId if needed for dashboard)
    const driver = await Driver.findOne({ loginName }).populate('busId');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    // ❌ Invalid password
    const valid = await bcrypt.compare(password, driver.password);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    // ✅ Set online
    driver.isOnline = true;
    await driver.save();

    // 🔐 Generate token with Dynamic Role from Database
    const token = jwt.sign(
      { 
        id: driver._id, 
        role: driver.role // ✅ হার্ডকোড করার বদলে ডাটাবেজ থেকে রোল নেওয়া হচ্ছে
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Hide password
    driver.password = undefined;

    // ✅ Success Response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: driver._id,
        name: driver.name,
        mobile: driver.mobile,
        licenseNumber: driver.licenseNumber,
        isOnline: driver.isOnline,
        role: driver.role, // ✅ ফ্রন্টএন্ডে রোল পাঠানো হচ্ছে
        bus: driver.busId
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

exports.getSingleDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }

    // ✅ বাস আইডির সব ফিল্ড (trips সহ) পপুলেট করা হয়েছে
    const driver = await Driver.findOne({
      _id: driverId,
      isDeleted: false
    }).populate("busId"); 

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    // পাসওয়ার্ড হাইড করা
    const driverObj = driver.toObject();
    delete driverObj.password;

    return res.status(200).json({
      success: true,
      message: "Driver fetched successfully",
      data: driverObj
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

// exports.getSingleDriver = async (req, res) => {
//   try {
//     const { driverId } = req.params;
//     console.log(driverId);
    
//     // ❌ Invalid ID
//     if (!mongoose.Types.ObjectId.isValid(driverId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid driver ID"
//       });
//     }

//     // ✅ Find driver + populate bus info
//     const driver = await Driver.findOne({
//       _id: driverId,
//       isDeleted: false
//     }).populate("busId", "busNo busName");
//    console.log(driver);
   
//     // ⚠️ Not found
//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: "Driver not found"
//       });
//     }

//     // Hide password
//     driver.password = undefined;

//     // ✅ Success
//     return res.status(200).json({
//       success: true,
//       message: "Driver fetched successfully",
//       data: driver
//     });

//   } catch (error) {
//     // ❌ Error
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Server error"
//     });
//   }
// };

exports.assignBus = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { busId } = req.body;
  console.log("BUSID",busId);
  console.log("driver id",driverId);
  
  
    // ❌ Validate driverId and busId
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }
    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bus ID"
      });
    }

    // ✅ Check if bus exists
    const bus = await Bus.findOne({ _id: busId,
       isDeleted: { $ne: true }
       });
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found"
      });
    }
    

    // ✅ Assign bus
    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { busId: bus._id },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Driver assigned to bus successfully",
      data: driver
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};
// Update live location
exports.getLiveDrivers = async (req, res) => {
  try {
    const now = Date.now();

    const drivers = await Driver.find({
      isOnline: true,
      isDeleted: false,
      lastUpdated: {
        $gte: new Date(now - 30000) // 🔥 last 30 sec
      }
    });

    res.json({
      success: true,
      data: drivers
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ message: 'Latitude and longitude required' });

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      {
        location: { type: 'Point', coordinates: [longitude, latitude] },
        lastUpdated: new Date()
      },
      { new: true }
    );
    res.json({ message: 'Location updated', driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getNearbyDrivers = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    // ❌ Missing params
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // ❌ Invalid numbers
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude"
      });
    }

    const drivers = await Driver.find({
      isDeleted: false,
      isOnline: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: 5000 // 5km
        }
      }
    }).populate("busId", "busNo busName");

    // ⚠️ No drivers nearby
    if (!drivers || drivers.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No nearby drivers found",
        totalDrivers: 0,
        data: []
      });
    }

    // ✅ Success
    return res.status(200).json({
      success: true,
      message: "Nearby drivers fetched successfully",
      totalDrivers: drivers.length,
      data: drivers
    });

  } catch (err) {
    // ❌ Error
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    const driverId = req.params.id;

    // Security check: Ensure driver is updating their own status
    if (req.user.id !== driverId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { isOnline },
      { new: true }
    ).select("-password");

    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });

    res.json({
      success: true,
      message: `Driver is now ${isOnline ? 'Online' : 'Offline'}`,
      data: driver
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};