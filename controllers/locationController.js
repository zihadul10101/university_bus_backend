
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

const { activeTrips, toSafeTrip } = require("../sockets/socketHandler"); // adjust path if needed

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
      "busName busNo capacity"
    );

    // ৩. মেমোরির ডাটার সাথে ডাটাবেসের নাম মার্জ (Merge) করা
    const activeRooms = liveTrips.map(([roomId, trip]) => {
      const dbBus = busDetails.find((b) => b._id.toString() === roomId);
      return {
        busId: roomId,
        busName: dbBus?.busName || trip.busInfo?.busName || "Unknown Bus",
        busNo: dbBus?.busNo || trip.busInfo?.busNo || "N/A",
        capacity: dbBus?.capacity ?? null,
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
    const busInfo = await Bus.findById(roomId).select("busName busNo capacity route");

    res.status(200).json({
      success: true,
      data: {
        busName: busInfo?.busName || trip.busInfo?.busName || "Unknown",
        busNo: busInfo?.busNo || trip.busInfo?.busNo || "N/A",
        capacity: busInfo?.capacity ?? null,
        route: busInfo?.route ?? null,
        ...toSafeTrip(trip),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ৩. Offline-queue flush endpoint: driver app POSTs a batch of GPS points
//    collected while the socket was disconnected. Only the latest point
//    updates "live" state; the full batch is optionally persisted for
//    trip-history / route-replay purposes.
exports.submitLocationBatch = async (req, res) => {
  try {
    const { roomId, points } = req.body;

    if (!roomId || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({
        success: false,
        message: "roomId and a non-empty points[] array are required",
      });
    }

    const latest = points[points.length - 1];
    if (latest.latitude == null || latest.longitude == null) {
      return res.status(400).json({
        success: false,
        message: "Each point requires latitude and longitude",
      });
    }

    const trip = activeTrips.get(roomId);

    if (trip) {
      trip.lastLocation = { latitude: latest.latitude, longitude: latest.longitude };
      trip.speed = latest.speed || 0;
      trip.lastUpdated = latest.timestamp ? new Date(latest.timestamp) : new Date();
      trip.isLive = true;
      trip.tripStatus = "active";
    }

    // Broadcast so any students currently connected see the catch-up point
    // immediately, without waiting for the driver's socket to reconnect.
    const io = req.app.get("io");
    if (io) {
      io.to(roomId).emit("location-broadcast", {
        roomId,
        latitude: latest.latitude,
        longitude: latest.longitude,
        speed: latest.speed || 0,
        lastUpdated: trip?.lastUpdated,
        viewerCount: trip ? trip.viewers.size : 0,
        isHeartbeat: false,
        recovered: true, // flag: this point came from an offline-queue flush, not a live tick
      });
    }

    // Best-effort persistence of the trip's latest known state. Not writing
    // every individual queued point to avoid unnecessary write load; if you
    // want full route replay, batch-insert `points` into a separate
    // LocationLog collection here instead.
    if (trip?.driverId) {
      await Trip.findOneAndUpdate(
        { busId: roomId, status: { $in: ["active", "paused"] } },
        {
          lastLocation: { latitude: latest.latitude, longitude: latest.longitude },
          lastSpeed: latest.speed || 0,
          lastUpdated: trip.lastUpdated,
        },
        { sort: { createdAt: -1 } }
      ).catch((err) => console.error("[submitLocationBatch] Trip update failed:", err.message));
    }

    res.status(200).json({ success: true, accepted: points.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};