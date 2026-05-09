// const { rooms } = require("../sockets/socketHandler");

// exports.getRoomStatus = (req, res) => {
//   const { roomId } = req.params;

//   const room = rooms[roomId];

//   if (!room) {
//     return res.status(404).json({
//       success: false,
//       message: "Room not found"
//     });
//   }

//   res.status(200).json({
//     success: true,
//     roomId,
//     usersConnected: room.users,
//     lastLocation: room.lastLocation,
//     lastUpdated: room.lastUpdated
//   });
// };

// locationController.js
// Destructuring ব্যবহার করে rooms ইমপোর্ট করুন
// const { rooms } = require("../sockets/socketHandler");

// // ১. নির্দিষ্ট একটি বাসের স্ট্যাটাস চেক
// exports.getRoomStatus = (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const room = rooms[roomId];

//     // যদি রুম না থাকে বা ড্রাইভার লাইভ না থাকে
//     if (!room || !room.isLive) {
//       return res.status(404).json({ 
//         success: false, 
//         message: "Bus is currently offline" 
//       });
//     }

//     res.status(200).json({ 
//       success: true, 
//       data: room 
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ২. বর্তমানে যতগুলো বাস লাইভ আছে সবার লিস্ট
// exports.getAllLiveRooms = (req, res) => {
//   try {
//     // অবজেক্টকে অ্যারেতে কনভার্ট করা ফ্রন্টএন্ডের (React Native) জন্য সুবিধাজনক
//     const activeTrips = Object.keys(rooms)
//       .filter(id => rooms[id].isLive) // শুধুমাত্র লাইভগুলো নিন
//       .map(id => ({
//         busId: id,
//         ...rooms[id]
//       }));

//     res.status(200).json({
//       success: true,
//       count: activeTrips.length,
//       activeRooms: activeTrips
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

const { rooms } = require("../sockets/socketHandler");
const Bus = require("../models/Bus"); 

// ১. বর্তমানে যতগুলো বাস লাইভ আছে সবার লিস্ট (বাসের নামসহ)
exports.getAllLiveRooms = async (req, res) => {
  try {
    // ১. মেমোরি থেকে লাইভ বাসগুলোর আইডি বের করা
    const liveBusIds = Object.keys(rooms).filter(id => rooms[id].isLive);

    if (liveBusIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        activeRooms: []
      });
    }

    // ২. ডাটাবেস থেকে ওই বাসগুলোর নাম এবং ডিটেইলস নিয়ে আসা
    const busDetails = await Bus.find({ _id: { $in: liveBusIds } }).select("busName busNo");

    // ৩. মেমোরির ডাটার সাথে ডাটাবেসের নাম মার্জ (Merge) করা
    const activeTrips = liveBusIds.map(id => {
      const dbBus = busDetails.find(b => b._id.toString() === id);
      return {
        busId: id,
        busName: dbBus ? dbBus.busName : "Unknown Bus",
        busNo: dbBus ? dbBus.busNo : "N/A",
        ...rooms[id]
      };
    });

    res.status(200).json({
      success: true,
      count: activeTrips.length,
      activeRooms: activeTrips
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ২. নির্দিষ্ট একটি বাসের স্ট্যাটাস চেক (নামসহ)
exports.getRoomStatus = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = rooms[roomId];

    if (!room || !room.isLive) {
      return res.status(404).json({ 
        success: false, 
        message: "Bus is currently offline" 
      });
    }

    // ডাটাবেস থেকে বাসের নাম নেওয়া
    const busInfo = await Bus.findById(roomId).select("busName busNo");

    res.status(200).json({ 
      success: true, 
      data: {
        busName: busInfo?.busName || "Unknown",
        busNo: busInfo?.busNo || "N/A",
        ...room
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};