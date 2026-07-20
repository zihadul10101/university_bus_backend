const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require("fs");
const mongoose = require("mongoose");




// exports.createDriver = async (req, res) => {
//   try {
//     const { name, mobile, licenseNumber, loginName, password } = req.body;

//     // ✅ ডুপ্লিকেট চেক (আপনার আগের লজিক ঠিক আছে)
//     const existingDriver = await Driver.findOne({
//       $or: [{ mobile }, { licenseNumber }, { loginName }]
//     });

//     if (existingDriver) {
//       // ... আপনার এরর হ্যান্ডলিং লজিক
//       return res.status(400).json({ success: false, message: "Duplicate value detected" });
//     }

//     // 🔐 পাসওয়ার্ড হ্যাশ করা
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // ✅ ড্রাইভার তৈরি (রোল অটোমেটিক 'driver' হিসেবে সেট হবে)
//     const driver = await Driver.create({
//       name,
//       mobile,
//       licenseNumber,
//       loginName,
//       password: hashedPassword,
//       role: "driver", // ম্যানুয়ালি নিশ্চিত করার জন্য দিতে পারেন
//       createdBy: req.user.id
//     });

//     driver.password = undefined; // রেসপন্স থেকে পাসওয়ার্ড হাইড করা

//     return res.status(201).json({
//       success: true,
//       message: "Driver created successfully",
//       data: driver
//     });

//   } catch (err) {
//     // ... আপনার এরর হ্যান্ডলিং
//   }
// };




// ✅ সেফ ডিলিট হেল্পার — ফাইল না থাকলে বা delete fail করলেও crash করবে না
const safeDeleteFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error("File delete failed:", e.message);
  }
};

exports.createDriver = async (req, res) => {

  try {
    const { name, mobile, licenseNumber, loginName, password } = req.body;
      console.log("Req Body:", req.body); // সব ফিল্ড ঠিকমতো আসছে কি না
  console.log("Req File:", req.file); // ইমেজ ফাইল আসছে কি না দেখুন

    // ✅ req.user না থাকলে আগেই ধরা (auth middleware ঠিকমতো req.user সেট করছে কিনা)
    if (!req.user || !req.user.id) {
      safeDeleteFile(req.file?.path);
      return res.status(401).json({ success: false, message: "Unauthorized: user not found in request" });
    }

    if (!name || !mobile || !licenseNumber || !loginName || !password) {
      safeDeleteFile(req.file?.path);
      return res.status(400).json({ success: false, message: "সব ফিল্ড আবশ্যক" });
    }

    const existingDriver = await Driver.findOne({
      $or: [{ mobile }, { licenseNumber }, { loginName }]
    });

    if (existingDriver) {
      safeDeleteFile(req.file?.path);
      return res.status(400).json({ success: false, message: "Duplicate value detected" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

   const imagePath = req.file ? req.file.path : null;

    const driver = await Driver.create({
      name,
      mobile,
      licenseNumber,
      loginName,
      password: hashedPassword,
      image: imagePath,
      role: "driver",
      createdBy: req.user.id
    });

    driver.password = undefined;

    return res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: driver
    });

  } catch (err) {
    // ✅ Render Logs-এ পুরো স্ট্যাক ট্রেস দেখার জন্য (আসল root cause ধরতে এটা জরুরি)
    console.error("Create Driver Error:", err);

    // ✅ এখন safeDeleteFile ব্যবহার করছি — double unlink-এ আর crash হবে না
    safeDeleteFile(req.file?.path);

    return res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
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

    // 🔍 req.body থেকে password-ও ডিস্ট্রাকচার করে নিন
    const { name, mobile, licenseNumber, busId, password } = req.body;

    if (name) driver.name = name;
    if (mobile) driver.mobile = mobile;
    if (licenseNumber) driver.licenseNumber = licenseNumber;
    if (busId) driver.busId = busId; 

    // 🔐 পাসওয়ার্ড চেঞ্জের মূল লজিক
    if (password && password.trim().length > 0) {
      // নতুন পাসওয়ার্ডটিকে ১০ রাউন্ড সল্ট দিয়ে হ্যাশ করে মডেলে অ্যাসাইন করা হচ্ছে
      const salt = await bcrypt.genSalt(10);
      driver.password = await bcrypt.hash(password, 10);
    }

    await driver.save();

    // রেসপন্সে পাঠানোর আগে সিকিউরিটির জন্য পাসওয়ার্ড ফিল্ডটি অবজেক্ট থেকে হাইড করে দিন
    const driverResponse = driver.toObject();
    delete driverResponse.password;

    res.json({
      success: true,
      message: "Driver updated successfully",
      data: driverResponse
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

// exports.getSingleDriver = async (req, res) => {
//   try {
//     const { driverId } = req.params;
    
//     if (!mongoose.Types.ObjectId.isValid(driverId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid driver ID"
//       });
//     }

//     // ✅ বাস আইডির সব ফিল্ড (trips সহ) পপুলেট করা হয়েছে
//     const driver = await Driver.findOne({
//       _id: driverId,
//       isDeleted: false
//     }).populate("busId"); 

//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: "Driver not found"
//       });
//     }

//     // পাসওয়ার্ড হাইড করা
//     const driverObj = driver.toObject();
//     delete driverObj.password;

//     return res.status(200).json({
//       success: true,
//       message: "Driver fetched successfully",
//       data: driverObj
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Server error"
//     });
//   }
// };


// ব্যাকএন্ড কন্ট্রোলারের getSingleDriver ফাংশনটি এভাবে সেফ করুন:
exports.getSingleDriver = async (req, res) => {
  try {
    // আপনার রাউটে যদি /single-driver/:driverId থাকে, তবে driverId ই আসবে
    const { driverId } = req.params; 

    // ডাটাবেজে ড্রাইভারটি খোঁজা এবং তার বাস পপুলেট করা
    const driver = await Driver.findById(driverId).populate('busId');

    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🚌 ড্রাইভার এবং বাস লিঙ্ক করার ফিক্সড কন্ট্রোলার
exports.assignBus = async (req, res) => {
  try {
    // 🎯 ডাটা সোর্স ঠিক করা হলো: driverId আসছে params থেকে, busId আসছে body থেকে
    const { driverId } = req.params;
    const { busId } = req.body;

    console.log(`📥 API Call -> Driver ID: ${driverId} | Target Bus ID: ${busId}`);

    if (!driverId || !busId) {
      return res.status(400).json({ 
        success: false, 
        message: "Driver ID or Bus ID is missing." 
      });
    }

    // ১. জিয়াদুল-৩ (টার্গেট ড্রাইভার) কে ডাটাবেজে খোঁজা
    const targetDriver = await Driver.findById(driverId);
    if (!targetDriver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found." 
      });
    }

    // 🎯 ২. ওটো-রিমুভ লজিক: এই বাসে (Bus 06) আগে যে ড্রাইভার (Zihadul1) ছিল তাকে খুঁজে বের করা
    const previousDriver = await Driver.findOne({ busId: busId });
    
    // যদি অন্য কোনো ড্রাইভার অলরেডি এই বাসে থাকে, তার বাস রিমুভ (null) করে দেওয়া
    if (previousDriver && previousDriver._id.toString() !== driverId) {
      previousDriver.busId = null;
      await previousDriver.save();
      console.log(`🧹 ${previousDriver.name} এর কাছ থেকে বাস মুক্ত করা হয়েছে।`);
    }

    // ৩. টার্গেট ড্রাইভারের (Zihadul3) যদি আগে কোনো ওল্ড বাস থেকে থাকে, সেই বাসের ড্রাইভার ফিল্ড নাল করা
    if (targetDriver.busId && targetDriver.busId.toString() !== busId) {
      await Bus.findByIdAndUpdate(targetDriver.busId, { driverId: null });
    }

    // ৪. টার্গেট ড্রাইভারের প্রোফাইলে নতুন বাস অ্যাসাইন করা
    targetDriver.busId = busId;
    await targetDriver.save();

    // ৫. বাসের মডেলে ড্রাইভারের রেফারেন্স আপডেট করা
    await Bus.findByIdAndUpdate(busId, { driverId: driverId });

    return res.status(200).json({
      success: true,
      message: "Bus assigned successfully! Previous driver removed automatically.",
      data: targetDriver
    });

  } catch (error) {
    console.error("🚨 Backend Assign Bus Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};
// exports.assignBus = async (req, res) => {
//   try {
//     const { driverId } = req.params;
//     const { busId } = req.body;

//     if (!driverId || !busId) {
//       return res.status(400).json({ success: false, message: "Driver ID and Bus ID are required" });
//     }

//     const currentDriver = await Driver.findById(driverId);
//     if (!currentDriver) {
//       return res.status(404).json({ success: false, message: "Driver not found" });
//     }

//     // ১. ওল্ড বাস ক্লিনআপ (যদি আগে কোনো বাস অ্যাসাইন থাকে তবে তার driverId ও driver ফিল্ড রিমুভ হবে)
//     if (currentDriver.busId) {
//       await Bus.findByIdAndUpdate(
//         currentDriver.busId, 
//         { 
//           $set: { driverId: null },
//           $unset: { driver: "" } // 🎯 পুরোনো 'driver' ফিল্ড ডাটাবেজ থেকে মুছে ফেলার জন্য
//         }
//       );
//     }

//     // ২. ⚡ নতুন বাসে শুধুমাত্র 'driverId' সেট করা এবং পুরোনো 'driver' ফিল্ড রিমুভ করা
//     const updatedBus = await Bus.findByIdAndUpdate(
//       busId, 
//       { 
//         $set: { driverId: driverId }, 
//         $unset: { driver: "" } // 🎯 এই বাসের অবজেক্ট থেকেও পুরোনো 'driver' কি (key) ডিলিট হয়ে যাবে
//       }, 
//       { new: true, strict: true } // strict: true স্কিমার বাইরের ফিল্ড সেভ হতে বাধা দেবে
//     );

//     if (!updatedBus) {
//       return res.status(404).json({ success: false, message: "Bus not found in database" });
//     }

//     // ৩. ড্রাইভারের নিজস্ব ডাটায় বাস আইডি সেভ করা
//     currentDriver.busId = busId;
//     await currentDriver.save();

//     return res.status(200).json({
//       success: true,
//       message: "Bus assigned and data cleaned successfully!",
//       data: currentDriver
//     });

//   } catch (error) {
//     console.error("Error in assignBus controller:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.assignBus = async (req, res) => {
//   try {
//     const { driverId } = req.params;
//     const { busId } = req.body;

//     if (!driverId || !busId) {
//       return res.status(400).json({ success: false, message: "Driver ID and Bus ID are required" });
//     }

//     // ১. ড্রাইভার চেক করা
//     const currentDriver = await Driver.findById(driverId);
//     if (!currentDriver) {
//       return res.status(404).json({ success: false, message: "Driver not found" });
//     }

//     // ২. ওল্ড বাস ক্লিনআপ (যদি আগে কোনো বাস অ্যাসাইন থাকে)
//     if (currentDriver.busId) {
//       await Bus.findByIdAndUpdate(
//         currentDriver.busId, 
//         { $set: { driver: null } }, // 🎯 $set অপারেটর দিয়ে ফোর্স করা হচ্ছে
//         { new: true, strict: false }
//       );
//     }

//     // ৩. ⚡ নতুন বাসে ড্রাইভার আইডি যোগ করা (ফোর্স আপডেট)
//     const updatedBus = await Bus.findByIdAndUpdate(
//       busId, 
//       { $set: { driver: driverId } }, // 🎯 মঙ্গোডিবিকে বাধ্য করা হচ্ছে নতুন ফিল্ড 'driver' তৈরি করে আইডি বসাতে
//       { new: true, strict: false }    // strict: false নিশ্চিত করে স্কিমা ক্যাশ ইগনোর করতে
//     );

//     if (!updatedBus) {
//       return res.status(404).json({ success: false, message: "Bus not found in database" });
//     }

//     // ৪. ড্রাইভারের নিজস্ব ডাটায় বাস আইডি সেভ করা
//     currentDriver.busId = busId;
//     await currentDriver.save();

//     console.log("✅ Updated Bus Data in DB:", updatedBus); // টার্মিনালে চেক করার জন্য লগ

//     return res.status(200).json({
//       success: true,
//       message: "Bus assigned and updated successfully everywhere!",
//       data: currentDriver
//     });

//   } catch (error) {
//     console.error("Error in assignBus controller:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
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

// exports.assignBus = async (req, res) => {
//   try {
//     const { driverId } = req.params;
//     const { busId } = req.body;
//   console.log("BUSID",busId);
//   console.log("driver id",driverId);
  
  
//     // ❌ Validate driverId and busId
//     if (!mongoose.Types.ObjectId.isValid(driverId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid driver ID"
//       });
//     }
//     if (!mongoose.Types.ObjectId.isValid(busId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid bus ID"
//       });
//     }

//     // ✅ Check if bus exists
//     const bus = await Bus.findOne({ _id: busId,
//        isDeleted: { $ne: true }
//        });
//     if (!bus) {
//       return res.status(404).json({
//         success: false,
//         message: "Bus not found"
//       });
//     }
    

//     // ✅ Assign bus
//     const driver = await Driver.findByIdAndUpdate(
//       driverId,
//       { busId: bus._id },
//       { new: true }
//     );

//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: "Driver not found"
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Driver assigned to bus successfully",
//       data: driver
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message || "Server error"
//     });
//   }
// };
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