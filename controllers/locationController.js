
// const { activeTrips, toSafeTrip } = require("../sockets/socketHandler"); // adjust path if needed

// const Bus = require("../models/Bus");

// // ১. বর্তমানে যতগুলো বাস লাইভ আছে সবার লিস্ট (বাসের নামসহ)
// exports.getAllLiveRooms = async (req, res) => {
//   try {
//     // ১. মেমোরি থেকে লাইভ ট্রিপগুলো বের করা (activeTrips একটি Map)
//     const liveTrips = Array.from(activeTrips.entries()).filter(
//       ([, trip]) => trip.isLive
//     );

//     if (liveTrips.length === 0) {
//       return res.status(200).json({
//         success: true,
//         count: 0,
//         activeRooms: [],
//       });
//     }

//     const liveBusIds = liveTrips.map(([roomId]) => roomId);

//     // ২. ডাটাবেস থেকে ওই বাসগুলোর নাম এবং ডিটেইলস নিয়ে আসা
//     const busDetails = await Bus.find({ _id: { $in: liveBusIds } }).select(
//       "busName busNo"
//     );

//     // ৩. মেমোরির ডাটার সাথে ডাটাবেসের নাম মার্জ (Merge) করা
//     const activeRooms = liveTrips.map(([roomId, trip]) => {
//       const dbBus = busDetails.find((b) => b._id.toString() === roomId);
//       return {
//         busId: roomId,
//         busName: dbBus?.busName || trip.busInfo?.busName || "Unknown Bus",
//         busNo: dbBus?.busNo || trip.busInfo?.busNo || "N/A",
//         ...toSafeTrip(trip),
//       };
//     });

//     res.status(200).json({
//       success: true,
//       count: activeRooms.length,
//       activeRooms,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ২. নির্দিষ্ট একটি বাসের স্ট্যাটাস চেক (নামসহ)
// exports.getRoomStatus = async (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const trip = activeTrips.get(roomId);

//     if (!trip || !trip.isLive) {
//       return res.status(404).json({
//         success: false,
//         message: "Bus is currently offline",
//       });
//     }

//     // ডাটাবেস থেকে বাসের নাম নেওয়া (fallback: trip.busInfo)
//     const busInfo = await Bus.findById(roomId).select("busName busNo");

//     res.status(200).json({
//       success: true,
//       data: {
//         busName: busInfo?.busName || trip.busInfo?.busName || "Unknown",
//         busNo: busInfo?.busNo || trip.busInfo?.busNo || "N/A",
//         ...toSafeTrip(trip),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

const {
  activeTrips,
  toSafeTrip,
  applyLocationUpdate,
  verifyTripOwnership,
} = require("../sockets/socketHandler"); // adjust path if needed

const Bus = require("../models/Bus");

// ১. বর্তমানে যতগুলো বাস লাইভ আছে সবার লিস্ট (বাসের নামসহ)
exports.getAllLiveRooms = async (req, res) => {
  try {
    // ১. মেমোরি থেকে লাইভ ট্রিপগুলো বের করা (activeTrips একটি Map)
    const liveTrips = Array.from(activeTrips.entries()).filter(
      ([, trip]) => trip.isLive
    );

    if (liveTrips.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        activeRooms: [],
      });
    }

    const liveBusIds = liveTrips.map(([roomId]) => roomId);

    // ২. ডাটাবেস থেকে ওই বাসগুলোর নাম এবং ডিটেইলস নিয়ে আসা
    const busDetails = await Bus.find({ _id: { $in: liveBusIds } }).select(
      "busName busNo"
    );

    // ৩. মেমোরির ডাটার সাথে ডাটাবেসের নাম মার্জ (Merge) করা
    const activeRooms = liveTrips.map(([roomId, trip]) => {
      const dbBus = busDetails.find((b) => b._id.toString() === roomId);
      return {
        busId: roomId,
        busName: dbBus?.busName || trip.busInfo?.busName || "Unknown Bus",
        busNo: dbBus?.busNo || trip.busInfo?.busNo || "N/A",
        ...toSafeTrip(trip),
      };
    });

    res.status(200).json({
      success: true,
      count: activeRooms.length,
      activeRooms,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ২. নির্দিষ্ট একটি বাসের স্ট্যাটাস চেক (নামসহ)
exports.getRoomStatus = async (req, res) => {
  try {
    const { roomId } = req.params;
    const trip = activeTrips.get(roomId);

    if (!trip || !trip.isLive) {
      return res.status(404).json({
        success: false,
        message: "Bus is currently offline",
      });
    }

    // ডাটাবেস থেকে বাসের নাম নেওয়া (fallback: trip.busInfo)
    const busInfo = await Bus.findById(roomId).select("busName busNo");

    res.status(200).json({
      success: true,
      data: {
        busName: busInfo?.busName || trip.busInfo?.busName || "Unknown",
        busNo: busInfo?.busNo || trip.busInfo?.busNo || "N/A",
        ...toSafeTrip(trip),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ৩. ✅ NEW — REST fallback location update।
// ড্রাইভার অ্যাপের background task যখন headless JS context এ চলে এবং
// socket তখনো handshake সম্পন্ন করেনি, তখন এই রুট দিয়ে লোকেশন পাঠানো হয়,
// যাতে GPS ping কখনো silently miss না হয়ে যায়।
//
// ⚠️ প্রোডাকশন হার্ডেনিং প্রয়োজন: এই মুহূর্তে ownership check শুধু
// `trip.driverId === driverId` মিলিয়ে করা হচ্ছে — অর্থাৎ কেউ যদি একজন
// active ড্রাইভারের driverId + roomId অনুমান করে ফেলে, সে ভুয়া লোকেশন
// পুশ করতে পারবে। এই রুটকে driver login এর JWT/Bearer টোকেন দিয়ে protect
// করে req.user.id === driverId চেক করাটা পরবর্তী ধাপে অবশ্যই করুন।
exports.updateLocationRest = async (req, res) => {
  try {
    const { roomId, driverId, latitude, longitude, speed } = req.body;

    if (!roomId || !driverId || latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: "roomId, driverId, latitude and longitude are required",
      });
    }

    if (!verifyTripOwnership(roomId, driverId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update location for this trip",
      });
    }

    const result = applyLocationUpdate(roomId, {
      latitude: Number(latitude),
      longitude: Number(longitude),
      speed: Number(speed) || 0,
    });

    if (!result.ok) {
      return res.status(409).json({ success: false, message: result.error });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};