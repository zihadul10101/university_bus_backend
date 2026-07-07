const moment = require("moment");
const mongoose = require('mongoose');
const Bus = require('../models/Bus');
const Driver = require("../models/Driver");

// Create Bus with Trips

exports.createBus = async (req, res) => {
  try {
    const { busNo, busName, trips } = req.body;

    // ১. বাস নম্বর আগে থেকে আছে কি না চেক করা
    const existingBus = await Bus.findOne({ busNo });
    if (existingBus) {
      return res.status(400).json({ 
        success: false, 
        message: "Bus with this bus number already exists" 
      });
    }

    // ২. নতুন বাসের একটি ইন্সট্যান্স (Instance) তৈরি করা
    const newBus = new Bus({ busNo, busName, trips });

    // ৩. সেভ করার আগে মঙ্গুস স্কিমার সব হুক (Validate & Sort) রান করানো নিশ্চিত করা
    await newBus.save();

    res.status(201).json({ 
      success: true, 
      message: "Bus created successfully", 
      data: newBus 
    });
  } catch (error) {
    // স্কিমার নিজস্ব কোনো এরর (যেমন: From time must be before To time) এখানে ধরা পড়বে
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};


// 🚌 backend/controllers/busController.js (অথবা যেখানে অল-বাস এপিআই লজিক আছে)
exports.getAllBuses = async (req, res) => {
  try {
    // 🎯 .populate('driverId') চেইন করে দিন
    const buses = await Bus.find({}).populate('driverId'); 
    
    return res.status(200).json({
      success: true,
      data: buses
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBusById = async (req, res) => {
  try {
    const { busId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bus ID"
      });
    }

    const bus = await Bus.findById(busId);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bus fetched successfully",
      data: bus
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};



exports.deleteBus = async (req, res) => {
  try {

    const { busId } = req.params; 

    const bus = await Bus.findByIdAndDelete(busId);

    if (!bus) {
      return res.status(404).json({ 
        success: false, 
        message: "Bus not found with this ID" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Bus deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.updateBus = async (req, res) => {
  try {
    const { busId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).json({ success: false, message: "Invalid Bus ID" });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found" });
    }

    // শুধুমাত্র পাঠানো ডাটাগুলো আপডেট করা
    if (req.body.busNo) bus.busNo = req.body.busNo;
    if (req.body.busName) bus.busName = req.body.busName;
    if (req.body.trips) bus.trips = req.body.trips;

    await bus.save(); // এটি আপনার মডেলের 'pre-save' সর্টিং রান করবে

    res.json({
      success: true,
      message: "Bus updated successfully",
      data: bus
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addTrip = async (req, res) => {
  try {
    const { busId } = req.params;
    // 🎯 ফ্রন্টএন্ড থেকে পাঠানো 'stops' অ্যারে সরাসরি রিসিভ করুন
    const { tripTitle, days, stops } = req.body; 

    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ success: false, message: "Bus not found" });

    // নতুন ট্রিপ পুশ করা (Mongoose auto-generates _id for trip and virtuals will handle from/to)
    bus.trips.push({ tripTitle, days, stops });

    // save() কল করলে pre-validate এবং pre-save হুক রান করবে (Sort, Time Check & Order)
    await bus.save();

    res.status(201).json({
      success: true,
      message: "Trip added successfully",
      data: bus.trips
    });
  } catch (error) {
    // pre-validate হুকের এরর মেসেজ সরাসরি এখানে ক্যাচ হবে
    res.status(500).json({ success: false, message: error.message });
  }
};
// Express Backend Controller Example
exports.updateTrip = async (req, res) => {
  try {
    const { busId, tripId } = req.params;
    const { tripTitle, days, stops } = req.body; // ফ্রন্টএন্ড থেকে পাঠানো নতুন ডেটা

    // ১. বেসিক ভ্যালিডেশন চেক
    if (!tripTitle || !days || !stops || !Array.isArray(stops)) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields or invalid stops format." 
      });
    }

    // ২. মঙ্গুজ পজিশনাল অপারেটর ($) দিয়ে নির্দিষ্ট ট্রিপের ভেতরের stops সহ সব ডাটা আপডেট করা
    const updatedBus = await Bus.findOneAndUpdate(
      { _id: busId, "trips._id": tripId }, // ফিল্টার: নির্দিষ্ট বাস এবং ওই বাসের নির্দিষ্ট ট্রিপ আইডি
      {
        $set: {
          "trips.$.tripTitle": tripTitle,
          "trips.$.days": days,
          "trips.$.stops": stops // ফ্রন্টএন্ডের নতুন স্টপ অ্যারে এখানে রিপ্লেস হবে
        }
      },
      { 
        new: true, // এটি নিশ্চিত করবে যে আপডেটেড ডাটা রেসপন্সে ব্যাক যাবে
        runValidators: true // স্কিমার validation (যেমন: TIME_REGEX বা enum) চেক করবে
      }
    );

    // ৩. যদি বাস বা ট্রিপ আইডি না মেলে
    if (!updatedBus) {
      return res.status(404).json({ 
        success: false, 
        message: "Bus or Trip not found with the provided IDs." 
      });
    }

    // ৪. সফলভাবে আপডেট হলে রেসপন্স
    return res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      data: updatedBus
    });

  } catch (error) {
    console.error("🚨 Error in updateTrip Backend:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || "Internal Server Error" 
    });
  }
};
// exports.addTrip = async (req, res) => {
//   try {
//     const { busId } = req.params;
//     const { tripTitle, days, from, to } = req.body;

//     const bus = await Bus.findById(busId);
//     if (!bus) return res.status(404).json({ success: false, message: "Bus not found" });

//     // নতুন ট্রিপ পুশ করা (Mongoose auto-generates _id)
//     bus.trips.push({ tripTitle, days, from, to });

//     // save() কল করলে আপনার মডেলের pre-save হুক রান করবে (Sort এবং Time Check)
//     await bus.save();

//     res.status(201).json({
//       success: true,
//       message: "Trip added successfully",
//       data: bus.trips
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// ২. ট্রিপ আপডেট করা
// exports.updateTrip = async (req, res) => {
//   try {
//     const { busId, tripId } = req.params;
//     const updateData = req.body;

//     const bus = await Bus.findById(busId);
//     if (!bus) return res.status(404).json({ success: false, message: "Bus not found" });

//     // সাব-ডকুমেন্ট আইডি দিয়ে ট্রিপ খুঁজে বের করা
//     const trip = bus.trips.id(tripId);
//     if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

//     // ডাটা আপডেট করা
//     if (updateData.tripTitle) trip.tripTitle = updateData.tripTitle;
//     if (updateData.days) trip.days = updateData.days;
//     if (updateData.from) {
//       if (updateData.from.stop) trip.from.stop = updateData.from.stop;
//       if (updateData.from.time) trip.from.time = updateData.from.time;
//     }
//     if (updateData.to) {
//       if (updateData.to.stop) trip.to.stop = updateData.to.stop;
//       if (updateData.to.time) trip.to.time = updateData.to.time;
//     }

//     await bus.save(); // pre-save হুক আবার সর্ট করে দেবে

//     res.json({
//       success: true,
//       message: "Trip updated successfully",
//       data: trip
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// ৩. ট্রিপ ডিলিট করা (যেহেতু আপনার মডেলে isDeleted নেই, তাই চিরস্থায়ী ডিলিট হবে)
exports.deleteTrip = async (req, res) => {
  try {
    const { busId, tripId } = req.params;

    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ success: false, message: "Bus not found" });

    // সাব-ডকুমেন্ট অ্যারে থেকে ট্রিপটি রিমুভ করা
    bus.trips.pull({ _id: tripId });

    await bus.save();

    res.json({
      success: true,
      message: "Trip deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ৪. সিঙ্গেল বাসের ডিটেইলস এবং ট্রিপ লিস্ট দেখা
exports.getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);
    if (!bus) return res.status(404).json({ success: false, message: "Bus not found" });

    res.json({
      success: true,
      data: bus
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// Get Live Trips (future, running, completed)

exports.getCurrentTrips = async (req, res) => {
  try {
    // ১. বর্তমান সময় এবং দিন বের করা
    const now = new Date();
    
    // সময় ফরম্যাট: HH:mm (আপনার মডেলের timeValidator অনুযায়ী)
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" + 
                        now.getMinutes().toString().padStart(2, '0');

    // দিন বের করা (আপনার মডেলের enum অনুযায়ী)
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = days[now.getDay()];

    // ২. সব বাস খুঁজে বের করা (অথবা যারা isDeleted: false)
    const buses = await Bus.find();

    let runningTrips = [];
    let upcomingTrips = [];

    buses.forEach(bus => {
      bus.trips.forEach(trip => {
        // আজকের দিনের ট্রিপ কি না চেক করা
        if (trip.days.includes(currentDay)) {
          
          // ক) Running Trip: সময় এখন from এবং to এর মাঝখানে
          if (currentTime >= trip.from.time && currentTime <= trip.to.time) {
            runningTrips.push({
              busId: bus._id,
              busName: bus.busName,
              busNo: bus.busNo,
              ...trip.toObject(),
              status: "running"
            });
          }
          
          // খ) Upcoming Trip: যাত্রা শুরু হবে বর্তমান সময়ের পর (পরবর্তী ৪ ঘণ্টার মধ্যে যেগুলো আছে)
          else if (trip.from.time > currentTime) {
            upcomingTrips.push({
              busId: bus._id,
              busName: bus.busName,
              busNo: bus.busNo,
              ...trip.toObject(),
              status: "upcoming"
            });
          }
        }
      });
    });

    // ৩. Upcoming ট্রিপগুলোকে সময়ের ক্রমানুসারে সাজানো
    upcomingTrips.sort((a, b) => a.from.time.localeCompare(b.from.time));

    // ৪. রেসপন্স পাঠানো
    res.status(200).json({
      success: true,
      message: "Current status fetched successfully",
      currentTime,
      currentDay,
      data: {
        runningCount: runningTrips.length,
        upcomingCount: upcomingTrips.length,
        runningTrips,
        upcomingTrips: upcomingTrips.slice(0, 5) // শুধু পরবর্তী ৫টি ট্রিপ দেখানো (অপশনাল)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

exports.getTripsStatus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);
    if (!bus) return res.status(404).json({ success: false, message: "Bus not found" });

    // বর্তমান সময় বের করা (HH:mm ফরম্যাটে)
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" + 
                        now.getMinutes().toString().padStart(2, '0');

    const trips = bus.trips.map(trip => {
      let status = "future"; // Default

      if (currentTime >= trip.from.time && currentTime <= trip.to.time) {
        status = "running";
      } else if (currentTime > trip.to.time) {
        status = "completed";
      }

      return {
        ...trip.toObject(),
        status: status
      };
    });

    res.json({
      success: true,
      data: {
        ...bus.toObject(),
        trips,
        summary: {
          running: trips.filter(t => t.status === "running").length,
          future: trips.filter(t => t.status === "future").length,
          completed: trips.filter(t => t.status === "completed").length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const convertTo24Hour = (timeStr) => {
  if (!timeStr) return "00:00";
  
  let match = timeStr.toUpperCase().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/);
  if (!match) return "00:00";

  let [_, hours, minutes, modifier] = match;
  let hoursInt = parseInt(hours, 10);

  if (modifier === "PM" && hoursInt < 12) hoursInt += 12;
  if (modifier === "AM" && hoursInt === 12) hoursInt = 0;

  return `${hoursInt.toString().padStart(2, "0")}:${minutes}`;
};



exports.getLiveTrips = async (req, res) => {
  try {
    // ১. সার্ভার যেখানেই থাকুক, সময়কে সবসময় বাংলাদেশের (Asia/Dhaka) সময়ে কনভার্ট করা
    const bdTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    const now = new Date(bdTimeString);

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = daysOfWeek[now.getDay()]; 

    // ২. বর্তমান সময়কে ২৪ ঘণ্টার HH:MM ফরম্যাটে নেওয়া
    const currentHours = now.getHours().toString().padStart(2, "0");
    const currentMinutes = now.getMinutes().toString().padStart(2, "0");
    const currentTime24 = `${currentHours}:${currentMinutes}`; 

    // ৩. মঙ্গুজ পপুলেট ট্রাই করবে (ব্যাকআপ হিসেবে)
    const buses = await Bus.find({ "trips.days": todayName })
      .populate({ path: 'driverId', strictPopulate: false })
      .populate({ path: 'driver', strictPopulate: false });

console.log("====== 🔥 [DEBUG] ALL RAW BUSES FROM DATABASE ======");
    console.log(JSON.stringify(buses, null, 2)); 
    console.log("====================================================");

    let runningTrips = [];
    let futureTrips = [];
    let completedTrips = [];

    // 🎯 ৪. এসিঙ্ক-অ্যাওয়েট সাপোর্ট করার জন্য traditional for...of লুপ ব্যবহার করা হলো
    for (const bus of buses) {
      for (const trip of bus.trips) {
        if (trip.days.includes(todayName)) {
          
          const startTimeStr = trip.from ? trip.from.time : null;
          const endTimeStr = trip.to ? trip.to.time : null;

          if (startTimeStr && endTimeStr) {
            const startTime24 = convertTo24Hour(startTimeStr); 
            const endTime24 = convertTo24Hour(endTimeStr);    

            // 🎯 ৫. ১০০% সেফ ড্রাইভার ইনফো ডিটেকশন মেকানিজম
            let activeDriver = null;

            // ক) যদি 'driver' বা 'driverId' অলরেডি অবজেক্ট আকারে পপুলেট হয়ে এসে থাকে
            if (bus.driver && typeof bus.driver === 'object' && bus.driver.name) {
              activeDriver = { name: bus.driver.name, mobile: bus.driver.mobile };
            } else if (bus.driverId && typeof bus.driverId === 'object' && bus.driverId.name) {
              activeDriver = { name: bus.driverId.name, mobile: bus.driverId.mobile };
            } 
            // খ) 🚨 ফলব্যাক: যদি পপুলেশন ফেইল করে এবং শুধু আইডি (String) পড়ে থাকে
            else {
              const rawDriverId = bus.driver || bus.driverId;
              if (rawDriverId) {
                // সরাসরি ডাটাবেজ থেকে ড্রাইভার কালেকশনে কোয়েরি মেরে ডাটা আনা হচ্ছে
                const matchedDriver = await Driver.findOne({ _id: rawDriverId, isDeleted: false });
                if (matchedDriver) {
                  activeDriver = { name: matchedDriver.name, mobile: matchedDriver.mobile };
                }
              }
            }

            const tripData = {
              _id: trip._id,
              busNo: bus.busNo,
              busName: bus.busName,
              tripTitle: trip.tripTitle,
              from: trip.from,
              to: trip.to,
              stops: trip.stops,
              days: trip.days,
              driver: activeDriver // ফ্রন্টএন্ডে ক্লিন অবজেক্ট চলে যাবে অথবা কোনো ড্রাইভার না থাকলে null যাবে
            };

            // ৬. বর্তমান সময়ের সাথে তুলনা করে সঠিক বক্সে ডাটা পুশ করা
            if (currentTime24 >= startTime24 && currentTime24 <= endTime24) {
              runningTrips.push(tripData);
            } else if (currentTime24 < startTime24) {
              futureTrips.push(tripData);
            } else if (currentTime24 > endTime24) {
              completedTrips.push(tripData);
            }
          }
        }
      }
    }

    console.log("====== 🚌 BACKEND LIVE TRIPS DATA ======");
    console.log("Today in BD:", todayName, "| BD Time:", currentTime24);
    console.log("Running Trips Count:", runningTrips.length);
    if (runningTrips.length > 0) {
      console.log("First Running Trip Driver Info:", runningTrips[0].driver);
    }
    console.log("=======================================");

    // ৭. ফাইনাল রেসপন্স পাঠানো
    res.status(200).json({
      success: true,
      data: {
        running: runningTrips,
        future: futureTrips,
        completed: completedTrips
      }
    });

  } catch (error) {
    console.error("🚨 Error in getLiveTrips:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};