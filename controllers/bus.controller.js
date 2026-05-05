const moment = require("moment");
const mongoose = require('mongoose');
const Bus = require('../models/Bus');

// Create Bus with Trips

exports.createBus = async (req, res) => {
  try {
    const { busNo, busName, trips } = req.body;

    // বাস নম্বর আগে থেকে আছে কি না চেক করা
    const existingBus = await Bus.findOne({ busNo });
    if (existingBus) {
      return res.status(400).json({ 
        success: false, 
        message: "Bus with this bus number already exists" 
      });
    }

    const bus = await Bus.create({ busNo, busName, trips });

    res.status(201).json({ 
      success: true, 
      message: "Bus created successfully", 
      data: bus 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllBuses = async (req, res) => {
  try {
    const buses = await Bus.find();
    
    return res.status(200).json({
      success: true,
      message: "Buses fetched successfully",
      totalBuses: buses.length,
      data: buses
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};
// exports.getAllBuses = async (req, res) => {
//   try {
//     // .populate() যোগ করা হয়েছে ড্রাইভারের নাম এবং মোবাইল নম্বর আনার জন্য
//     const buses = await Bus.find()
//       .populate("assignedDriver", "name mobile"); 

//     return res.status(200).json({
//       success: true,
//       message: "Buses fetched successfully",
//       totalBuses: buses.length,
//       data: buses
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Server error"
//     });
//   }
// };
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
    const { tripTitle, days, from, to } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ success: false, message: "Bus not found" });

    // নতুন ট্রিপ পুশ করা (Mongoose auto-generates _id)
    bus.trips.push({ tripTitle, days, from, to });

    // save() কল করলে আপনার মডেলের pre-save হুক রান করবে (Sort এবং Time Check)
    await bus.save();

    res.status(201).json({
      success: true,
      message: "Trip added successfully",
      data: bus.trips
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ২. ট্রিপ আপডেট করা
exports.updateTrip = async (req, res) => {
  try {
    const { busId, tripId } = req.params;
    const updateData = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ success: false, message: "Bus not found" });

    // সাব-ডকুমেন্ট আইডি দিয়ে ট্রিপ খুঁজে বের করা
    const trip = bus.trips.id(tripId);
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    // ডাটা আপডেট করা
    if (updateData.tripTitle) trip.tripTitle = updateData.tripTitle;
    if (updateData.days) trip.days = updateData.days;
    if (updateData.from) {
      if (updateData.from.stop) trip.from.stop = updateData.from.stop;
      if (updateData.from.time) trip.from.time = updateData.from.time;
    }
    if (updateData.to) {
      if (updateData.to.stop) trip.to.stop = updateData.to.stop;
      if (updateData.to.time) trip.to.time = updateData.to.time;
    }

    await bus.save(); // pre-save হুক আবার সর্ট করে দেবে

    res.json({
      success: true,
      message: "Trip updated successfully",
      data: trip
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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


