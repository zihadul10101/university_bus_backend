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
   
    const bdTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    const now = new Date(bdTimeString);

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = daysOfWeek[now.getDay()]; 

  
    const currentHours = now.getHours().toString().padStart(2, "0");
    const currentMinutes = now.getMinutes().toString().padStart(2, "0");
    const currentTime24 = `${currentHours}:${currentMinutes}`; 


    const buses = await Bus.find({ "trips.days": todayName })
      .populate({ path: 'driverId', strictPopulate: false })
      .populate({ path: 'driver', strictPopulate: false });


    let runningTrips = [];
    let futureTrips = [];
    let completedTrips = [];

  
    for (const bus of buses) {
      for (const trip of bus.trips) {
        if (trip.days.includes(todayName)) {
          
          const startTimeStr = trip.from ? trip.from.time : null;
          const endTimeStr = trip.to ? trip.to.time : null;

          if (startTimeStr && endTimeStr) {
            const startTime24 = convertTo24Hour(startTimeStr); 
            const endTime24 = convertTo24Hour(endTimeStr);    

           
            let activeDriver = null;

      
            if (bus.driver && typeof bus.driver === 'object' && bus.driver.name) {
              activeDriver = { name: bus.driver.name, mobile: bus.driver.mobile };
            } else if (bus.driverId && typeof bus.driverId === 'object' && bus.driverId.name) {
              activeDriver = { name: bus.driverId.name, mobile: bus.driverId.mobile };
            } 
        
            else {
              const rawDriverId = bus.driver || bus.driverId;
              if (rawDriverId) {
                
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
              driver: activeDriver 
            };

            
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