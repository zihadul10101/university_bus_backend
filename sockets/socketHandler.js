// /**
//  * socketHandler.js
//  * ---------------------------------------------------------------
//  * Campus Bus Live Tracking - Socket.IO v4 handler
//  * ---------------------------------------------------------------
//  */

// const Driver = require("../models/Driver"); // adjust path
// const Bus = require("../models/Bus"); // adjust path

// // ------------------------------------------------------------------
// // In-memory state
// // ------------------------------------------------------------------

// const activeTrips = new Map();
// const driverRoomMap = new Map();

// const LOCATION_BROADCAST_INTERVAL = 10 * 1000;
// const DRIVER_INACTIVITY_TIMEOUT = 30 * 1000;
// const STALE_SOCKET_SWEEP_INTERVAL = 20 * 1000;

// // ------------------------------------------------------------------
// // Helpers - DB fetch
// // ------------------------------------------------------------------

// async function fetchDriverInfo(driverId) {
//   try {
//     const driver = await Driver.findById(driverId)
//       .select("name phone photo licenseNo")
//       .lean();
//     return driver || null;
//   } catch (err) {
//     console.error("[socketHandler] fetchDriverInfo error:", err.message);
//     return null;
//   }
// }

// async function fetchBusInfo(busId) {
//   try {
//     const bus = await Bus.findById(busId)
//       .populate("driverId", "name phone photo")
//       .select("busName busNo driverId")
//       .lean();
//     return bus || null;
//   } catch (err) {
//     console.error("[socketHandler] fetchBusInfo error:", err.message);
//     return null;
//   }
// }

// // ------------------------------------------------------------------
// // Helpers - room/trip state
// // ------------------------------------------------------------------

// function getOrCreateTrip(roomId) {
//   if (!activeTrips.has(roomId)) {
//     activeTrips.set(roomId, {
//       busId: roomId,
//       driverId: null,
//       driverInfo: null,
//       busInfo: null,
//       lastLocation: null,
//       speed: 0,
//       lastUpdated: null,
//       isLive: false,
//       driverSocketId: null,
//       viewers: new Map(),
//       broadcastInterval: null,
//       inactivityTimer: null,
//     });
//   }
//   return activeTrips.get(roomId);
// }

// function getViewerList(roomId) {
//   const trip = activeTrips.get(roomId);
//   if (!trip) return [];
//   return Array.from(trip.viewers.entries()).map(([socketId, info]) => ({
//     socketId,
//     ...info,
//   }));
// }

// function getViewerCount(roomId) {
//   const trip = activeTrips.get(roomId);
//   return trip ? trip.viewers.size : 0;
// }

// function clearTripTimers(trip) {
//   if (trip.broadcastInterval) {
//     clearInterval(trip.broadcastInterval);
//     trip.broadcastInterval = null;
//   }
//   if (trip.inactivityTimer) {
//     clearTimeout(trip.inactivityTimer);
//     trip.inactivityTimer = null;
//   }
// }

// function destroyTrip(io, roomId, { notify = true } = {}) {
//   const trip = activeTrips.get(roomId);
//   if (!trip) return;

//   clearTripTimers(trip);

//   if (trip.driverId) {
//     driverRoomMap.delete(String(trip.driverId));
//   }

//   if (notify) {
//     io.to(roomId).emit("driver-offline", { roomId });
//     io.to(roomId).emit("trip-ended", { roomId });
//   }

//   activeTrips.delete(roomId);
//   console.log(`[Trip Ended] Room ${roomId} removed from memory.`);
// }

// function startBroadcastHeartbeat(io, roomId) {
//   const trip = activeTrips.get(roomId);
//   if (!trip) return;

//   if (trip.broadcastInterval) clearInterval(trip.broadcastInterval);

//   trip.broadcastInterval = setInterval(() => {
//     const current = activeTrips.get(roomId);
//     if (!current || !current.isLive || !current.lastLocation) return;

//     io.to(roomId).emit("location-broadcast", {
//       roomId,
//       latitude: current.lastLocation.latitude,
//       longitude: current.lastLocation.longitude,
//       speed: current.speed,
//       lastUpdated: current.lastUpdated,
//       viewerCount: getViewerCount(roomId),
//       isHeartbeat: true,
//     });
//   }, LOCATION_BROADCAST_INTERVAL);
// }

// function resetInactivityTimer(io, roomId) {
//   const trip = activeTrips.get(roomId);
//   if (!trip) return;

//   if (trip.inactivityTimer) clearTimeout(trip.inactivityTimer);

//   trip.inactivityTimer = setTimeout(() => {
//     const current = activeTrips.get(roomId);
//     if (!current) return;

//     current.isLive = false;
//     io.to(roomId).emit("driver-offline", { roomId, reason: "inactive" });
//     console.log(`[Inactivity] Driver on room ${roomId} marked offline.`);
//   }, DRIVER_INACTIVITY_TIMEOUT);
// }

// function broadcastViewerCount(io, roomId) {
//   io.to(roomId).emit("viewer-count", { roomId, count: getViewerCount(roomId) });
// }

// function toSafeTrip(trip) {
//   if (!trip) return null;
//   const { broadcastInterval, inactivityTimer, viewers, ...safe } = trip;
//   return {
//     ...safe,
//     viewerCount: viewers ? viewers.size : 0,
//   };
// }

// // ------------------------------------------------------------------
// // Main handler
// // ------------------------------------------------------------------

// const socketHandler = (io) => {
//   io.on("connection", (socket) => {
//     console.log("[Socket] Connected:", socket.id);

//     socket.data.roomId = null;
//     socket.data.role = null;
//     socket.data.userId = null;
//     socket.data.driverId = null;

//     // ----------------------------------------------------------------
//     // 1. Join room - used by Student / Admin / Driver alike
//     // ----------------------------------------------------------------
//     socket.on("join-room", async ({ roomId, role = "student", userId = null } = {}) => {
//       if (!roomId) return;

//       socket.join(roomId);
//       socket.data.roomId = roomId;
//       socket.data.role = role;
//       socket.data.userId = userId;

//       const trip = getOrCreateTrip(roomId);

//       trip.viewers.set(socket.id, {
//         userId,
//         role,
//         joinedAt: new Date(),
//       });

//       console.log(`[join-room] ${role} (${socket.id}) joined room ${roomId}`);

//       socket.emit("trip-snapshot", {
//         roomId,
//         driverInfo: trip.driverInfo,
//         busInfo: trip.busInfo,
//         lastLocation: trip.lastLocation,
//         speed: trip.speed,
//         lastUpdated: trip.lastUpdated,
//         isLive: trip.isLive,
//         viewerCount: getViewerCount(roomId),
//       });

//       broadcastViewerCount(io, roomId);
//     });

//     // ----------------------------------------------------------------
//     // 2. Driver starts live tracking
//     // ----------------------------------------------------------------
//     socket.on("start-trip", async ({ roomId, driverId } = {}, ack) => {
//       if (!roomId || !driverId) {
//         if (typeof ack === "function") ack({ ok: false, error: "roomId and driverId are required" });
//         return;
//       }

//       try {
//         socket.join(roomId);
//         socket.data.roomId = roomId;
//         socket.data.role = "driver";
//         socket.data.driverId = driverId;

//         const trip = getOrCreateTrip(roomId);

//         const [driverInfo, busInfo] = await Promise.all([
//           fetchDriverInfo(driverId),
//           fetchBusInfo(roomId),
//         ]);

//         trip.driverId = driverId;
//         trip.driverInfo = driverInfo;
//         trip.busInfo = busInfo;
//         trip.isLive = true;
//         trip.driverSocketId = socket.id;

//         driverRoomMap.set(String(driverId), roomId);

//         startBroadcastHeartbeat(io, roomId);
//         resetInactivityTimer(io, roomId);

//         io.to(roomId).emit("driver-online", {
//           roomId,
//           driverInfo,
//           busInfo,
//         });

//         console.log(`[start-trip] Driver ${driverId} started trip on room ${roomId}`);

//         if (typeof ack === "function") {
//           ack({ ok: true, driverInfo, busInfo });
//         }
//       } catch (err) {
//         console.error("[start-trip] error:", err.message);
//         if (typeof ack === "function") ack({ ok: false, error: "Failed to start trip" });
//       }
//     });

//     // ----------------------------------------------------------------
//     // 3. Location update from driver app
//     // ----------------------------------------------------------------
//     socket.on("update-location", (data = {}) => {
//       const { roomId, latitude, longitude, speed = 0 } = data;
//       if (!roomId || latitude == null || longitude == null) return;

//       const trip = getOrCreateTrip(roomId);

//       trip.lastLocation = { latitude, longitude };
//       trip.speed = speed;
//       trip.lastUpdated = new Date();
//       trip.isLive = true;
//       trip.driverSocketId = socket.id;

//       resetInactivityTimer(io, roomId);

//       io.to(roomId).emit("location-broadcast", {
//         roomId,
//         latitude,
//         longitude,
//         speed,
//         lastUpdated: trip.lastUpdated,
//         viewerCount: getViewerCount(roomId),
//         isHeartbeat: false,
//       });
//     });

//     // ----------------------------------------------------------------
//     // 4. Get viewer list on demand
//     // ----------------------------------------------------------------
//     socket.on("get-viewers", (roomId, ack) => {
//       const list = getViewerList(roomId);
//       if (typeof ack === "function") {
//         ack({ ok: true, roomId, viewers: list, count: list.length });
//       } else {
//         socket.emit("viewer-list", { roomId, viewers: list, count: list.length });
//       }
//     });

//     // ----------------------------------------------------------------
//     // 5. Driver stops sharing -> clear active trip (DRIVER ONLY!)
//     // ----------------------------------------------------------------
//     socket.on("stop-sharing", (roomId) => {
//       if (!roomId) return;
//       destroyTrip(io, roomId);
//     });

//     // ----------------------------------------------------------------
//     // 5b. Viewer leaves room WITHOUT ending the trip for others
//     // ----------------------------------------------------------------
//     socket.on("leave-room", (roomId) => {
//       if (!roomId) return;
//       socket.leave(roomId);

//       const trip = activeTrips.get(roomId);
//       if (trip) {
//         trip.viewers.delete(socket.id);
//         broadcastViewerCount(io, roomId);
//       }

//       console.log(`[leave-room] ${socket.id} left room ${roomId}`);
//     });

//     // ----------------------------------------------------------------
//     // 6. Disconnect handling + driver reconnection recovery
//     // ----------------------------------------------------------------
//     socket.on("disconnecting", () => {
//       const { roomId, role, driverId } = socket.data;
//       if (!roomId) return;

//       const trip = activeTrips.get(roomId);
//       if (!trip) return;

//       trip.viewers.delete(socket.id);
//       broadcastViewerCount(io, roomId);

//       if (role === "driver" && trip.driverSocketId === socket.id) {
//         console.log(`[disconnecting] Driver socket ${socket.id} left room ${roomId}, awaiting recovery...`);

//         setTimeout(() => {
//           const current = activeTrips.get(roomId);
//           if (!current) return;

//           if (current.driverSocketId !== socket.id) return;

//           current.isLive = false;
//           io.to(roomId).emit("driver-offline", { roomId, reason: "disconnected" });
//           console.log(`[Recovery Timeout] Driver did not reconnect for room ${roomId}.`);
//         }, 10 * 1000);
//       }
//     });

//     socket.on("disconnect", () => {
//       console.log("[Socket] Disconnected:", socket.id);
//     });

//     // ----------------------------------------------------------------
//     // 7. Explicit driver reconnect (optional client-side call)
//     // ----------------------------------------------------------------
//     socket.on("resume-trip", ({ driverId } = {}, ack) => {
//       const roomId = driverRoomMap.get(String(driverId));
//       const trip = roomId ? activeTrips.get(roomId) : null;

//       if (!trip) {
//         if (typeof ack === "function") ack({ ok: false, error: "No active trip found" });
//         return;
//       }

//       socket.join(roomId);
//       socket.data.roomId = roomId;
//       socket.data.role = "driver";
//       socket.data.driverId = driverId;

//       trip.driverSocketId = socket.id;
//       trip.isLive = true;

//       resetInactivityTimer(io, roomId);
//       io.to(roomId).emit("driver-online", {
//         roomId,
//         driverInfo: trip.driverInfo,
//         busInfo: trip.busInfo,
//       });

//       console.log(`[resume-trip] Driver ${driverId} resumed trip on room ${roomId}`);

//       if (typeof ack === "function") {
//         ack({ ok: true, roomId, driverInfo: trip.driverInfo, busInfo: trip.busInfo });
//       }
//     });
//   }); // <-- io.on("connection", ...) ক্লোজ হচ্ছে এখানে

//   // ------------------------------------------------------------------
//   // Periodic sweep: remove stale trips
//   // ------------------------------------------------------------------
//   setInterval(() => {
//     for (const [roomId, trip] of activeTrips.entries()) {
//       const room = io.sockets.adapter.rooms.get(roomId);
//       const actualCount = room ? room.size : 0;

//       if (actualCount === 0) {
//         console.log(`[Sweep] Room ${roomId} has no sockets left, cleaning up.`);
//         destroyTrip(io, roomId, { notify: false });
//         continue;
//       }

//       for (const socketId of trip.viewers.keys()) {
//         if (!io.sockets.sockets.get(socketId)) {
//           trip.viewers.delete(socketId);
//         }
//       }

//       const staleForTooLong =
//         !trip.isLive &&
//         trip.lastUpdated &&
//         Date.now() - new Date(trip.lastUpdated).getTime() > 5 * 60 * 1000;

//       if (staleForTooLong) {
//         console.log(`[Sweep] Room ${roomId} stale for 5+ min, removing.`);
//         destroyTrip(io, roomId);
//       }
//     }
//   }, STALE_SOCKET_SWEEP_INTERVAL);
// };

// module.exports = {
//   socketHandler,
//   activeTrips,
//   getViewerList,
//   getViewerCount,
//   toSafeTrip,
// };

/**
 * socketHandler.js
 * ---------------------------------------------------------------
 * Campus Bus Live Tracking - Socket.IO v4 handler
 * ---------------------------------------------------------------
 * CHANGELOG (this revision):
 *  - Added JWT auth at handshake (io.use in index.js calls into this
 *    file's `attachAuthMiddleware` helper) so driverId/roomId can be
 *    trusted against the authenticated socket.
 *  - Added explicit trip controls: pause-trip, resume-trip-control, end-trip
 *    (kept the original disconnect-recovery `resume-trip` event as-is,
 *    it solves a different problem: reconnecting after an unexpected drop).
 *  - Added driver-heartbeat, decoupled from GPS updates, so the student
 *    app can distinguish "offline" vs "no GPS fix" vs "poor internet".
 *  - Added update-occupancy for optional seats-available display.
 *  - toSafeTrip now exposes tripStatus, lastHeartbeat, batteryLevel,
 *    gpsAccuracy, seatsAvailable.
 * ---------------------------------------------------------------
 */

const jwt = require("jsonwebtoken");
const Driver = require("../models/Driver"); // adjust path
const Bus = require("../models/Bus"); // adjust path

// ------------------------------------------------------------------
// In-memory state
// ------------------------------------------------------------------

const activeTrips = new Map();
const driverRoomMap = new Map();

const LOCATION_BROADCAST_INTERVAL = 10 * 1000;
const DRIVER_INACTIVITY_TIMEOUT = 30 * 1000;
const STALE_SOCKET_SWEEP_INTERVAL = 20 * 1000;

// ------------------------------------------------------------------
// Auth middleware (call from index.js: io.use(attachAuthMiddleware))
// ------------------------------------------------------------------

function attachAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  // Allow students/admins to connect without a driver-grade token if you
  // want tracking to be viewable without login. If everyone must be
  // authenticated, remove this early-return.
  if (!token) {
    socket.data.authRole = "guest";
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.authUserId = decoded.id;
    socket.data.authRole = decoded.role; // e.g. "driver" | "student" | "super_admin" | "sub_admin"
    next();
  } catch (err) {
    next(new Error("unauthorized"));
  }
}

// ------------------------------------------------------------------
// Helpers - DB fetch
// ------------------------------------------------------------------

async function fetchDriverInfo(driverId) {
  try {
    const driver = await Driver.findById(driverId)
      .select("name phone photo licenseNo")
      .lean();
    return driver || null;
  } catch (err) {
    console.error("[socketHandler] fetchDriverInfo error:", err.message);
    return null;
  }
}

async function fetchBusInfo(busId) {
  try {
    const bus = await Bus.findById(busId)
      .populate("driverId", "name phone photo")
      .select("busName busNo driverId capacity")
      .lean();
    return bus || null;
  } catch (err) {
    console.error("[socketHandler] fetchBusInfo error:", err.message);
    return null;
  }
}

// ------------------------------------------------------------------
// Helpers - room/trip state
// ------------------------------------------------------------------

function getOrCreateTrip(roomId) {
  if (!activeTrips.has(roomId)) {
    activeTrips.set(roomId, {
      busId: roomId,
      driverId: null,
      driverInfo: null,
      busInfo: null,
      lastLocation: null,
      speed: 0,
      lastUpdated: null,
      isLive: false,
      tripStatus: "idle", // "idle" | "active" | "paused" | "ended"
      driverSocketId: null,
      lastHeartbeat: null,
      batteryLevel: null,
      gpsAccuracy: null,
      seatsAvailable: null,
      viewers: new Map(),
      broadcastInterval: null,
      inactivityTimer: null,
    });
  }
  return activeTrips.get(roomId);
}

function getViewerList(roomId) {
  const trip = activeTrips.get(roomId);
  if (!trip) return [];
  return Array.from(trip.viewers.entries()).map(([socketId, info]) => ({
    socketId,
    ...info,
  }));
}

function getViewerCount(roomId) {
  const trip = activeTrips.get(roomId);
  return trip ? trip.viewers.size : 0;
}

function clearTripTimers(trip) {
  if (trip.broadcastInterval) {
    clearInterval(trip.broadcastInterval);
    trip.broadcastInterval = null;
  }
  if (trip.inactivityTimer) {
    clearTimeout(trip.inactivityTimer);
    trip.inactivityTimer = null;
  }
}

function destroyTrip(io, roomId, { notify = true } = {}) {
  const trip = activeTrips.get(roomId);
  if (!trip) return;

  clearTripTimers(trip);

  if (trip.driverId) {
    driverRoomMap.delete(String(trip.driverId));
  }

  if (notify) {
    io.to(roomId).emit("driver-offline", { roomId });
    io.to(roomId).emit("trip-ended", { roomId });
  }

  activeTrips.delete(roomId);
  console.log(`[Trip Ended] Room ${roomId} removed from memory.`);
}

function startBroadcastHeartbeat(io, roomId) {
  const trip = activeTrips.get(roomId);
  if (!trip) return;

  if (trip.broadcastInterval) clearInterval(trip.broadcastInterval);

  trip.broadcastInterval = setInterval(() => {
    const current = activeTrips.get(roomId);
    if (!current || !current.isLive || !current.lastLocation) return;

    io.to(roomId).emit("location-broadcast", {
      roomId,
      latitude: current.lastLocation.latitude,
      longitude: current.lastLocation.longitude,
      speed: current.speed,
      lastUpdated: current.lastUpdated,
      viewerCount: getViewerCount(roomId),
      isHeartbeat: true,
    });
  }, LOCATION_BROADCAST_INTERVAL);
}

function resetInactivityTimer(io, roomId) {
  const trip = activeTrips.get(roomId);
  if (!trip) return;

  if (trip.inactivityTimer) clearTimeout(trip.inactivityTimer);

  trip.inactivityTimer = setTimeout(() => {
    const current = activeTrips.get(roomId);
    if (!current) return;

    // Don't auto-offline a trip the driver intentionally paused.
    if (current.tripStatus === "paused") return;

    current.isLive = false;
    io.to(roomId).emit("driver-offline", { roomId, reason: "inactive" });
    console.log(`[Inactivity] Driver on room ${roomId} marked offline.`);
  }, DRIVER_INACTIVITY_TIMEOUT);
}

function broadcastViewerCount(io, roomId) {
  io.to(roomId).emit("viewer-count", { roomId, count: getViewerCount(roomId) });
}

function toSafeTrip(trip) {
  if (!trip) return null;
  const { broadcastInterval, inactivityTimer, viewers, ...safe } = trip;
  return {
    ...safe,
    viewerCount: viewers ? viewers.size : 0,
  };
}

// ------------------------------------------------------------------
// Main handler
// ------------------------------------------------------------------

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("[Socket] Connected:", socket.id, "role:", socket.data.authRole);

    socket.data.roomId = null;
    socket.data.role = null;
    socket.data.userId = null;
    socket.data.driverId = null;

    // ----------------------------------------------------------------
    // 1. Join room - used by Student / Admin / Driver alike
    // ----------------------------------------------------------------
    socket.on("join-room", async ({ roomId, role = "student", userId = null } = {}) => {
      if (!roomId) return;

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = role;
      socket.data.userId = userId;

      const trip = getOrCreateTrip(roomId);

      trip.viewers.set(socket.id, {
        userId,
        role,
        joinedAt: new Date(),
      });

      console.log(`[join-room] ${role} (${socket.id}) joined room ${roomId}`);

      socket.emit("trip-snapshot", {
        roomId,
        driverInfo: trip.driverInfo,
        busInfo: trip.busInfo,
        lastLocation: trip.lastLocation,
        speed: trip.speed,
        lastUpdated: trip.lastUpdated,
        isLive: trip.isLive,
        tripStatus: trip.tripStatus,
        gpsAccuracy: trip.gpsAccuracy,
        seatsAvailable: trip.seatsAvailable,
        viewerCount: getViewerCount(roomId),
      });

      broadcastViewerCount(io, roomId);
    });

    // ----------------------------------------------------------------
    // 2. Driver starts live tracking
    // ----------------------------------------------------------------
    socket.on("start-trip", async ({ roomId, driverId } = {}, ack) => {
      if (!roomId || !driverId) {
        if (typeof ack === "function") ack({ ok: false, error: "roomId and driverId are required" });
        return;
      }

      // Trust boundary: if the socket authenticated as a driver, make sure
      // it's THIS driver starting THIS trip, not spoofing another driverId.
      if (socket.data.authRole === "driver" && socket.data.authUserId !== String(driverId)) {
        if (typeof ack === "function") ack({ ok: false, error: "driverId does not match authenticated user" });
        return;
      }

      try {
        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.role = "driver";
        socket.data.driverId = driverId;

        const trip = getOrCreateTrip(roomId);

        const [driverInfo, busInfo] = await Promise.all([
          fetchDriverInfo(driverId),
          fetchBusInfo(roomId),
        ]);

        trip.driverId = driverId;
        trip.driverInfo = driverInfo;
        trip.busInfo = busInfo;
        trip.isLive = true;
        trip.tripStatus = "active";
        trip.driverSocketId = socket.id;

        driverRoomMap.set(String(driverId), roomId);

        startBroadcastHeartbeat(io, roomId);
        resetInactivityTimer(io, roomId);

        io.to(roomId).emit("driver-online", {
          roomId,
          driverInfo,
          busInfo,
        });

        console.log(`[start-trip] Driver ${driverId} started trip on room ${roomId}`);

        if (typeof ack === "function") {
          ack({ ok: true, driverInfo, busInfo });
        }
      } catch (err) {
        console.error("[start-trip] error:", err.message);
        if (typeof ack === "function") ack({ ok: false, error: "Failed to start trip" });
      }
    });

    // ----------------------------------------------------------------
    // 2b. Driver pauses the trip (e.g. on break) - does NOT end it and
    //     does NOT trigger the inactivity "offline" warning.
    // ----------------------------------------------------------------
    socket.on("pause-trip", ({ roomId } = {}, ack) => {
      const trip = activeTrips.get(roomId);
      if (!trip) {
        if (typeof ack === "function") ack({ ok: false, error: "No active trip" });
        return;
      }

      trip.isLive = false;
      trip.tripStatus = "paused";
      clearTripTimers(trip);

      io.to(roomId).emit("trip-paused", { roomId });
      console.log(`[pause-trip] Room ${roomId} paused`);

      if (typeof ack === "function") ack({ ok: true });
    });

    // ----------------------------------------------------------------
    // 2c. Driver resumes a paused trip (trip-control resume, distinct
    //     from the disconnect-recovery `resume-trip` event below).
    // ----------------------------------------------------------------
    socket.on("resume-trip-control", ({ roomId } = {}, ack) => {
      const trip = activeTrips.get(roomId);
      if (!trip) {
        if (typeof ack === "function") ack({ ok: false, error: "No active trip" });
        return;
      }

      trip.isLive = true;
      trip.tripStatus = "active";
      trip.driverSocketId = socket.id;

      startBroadcastHeartbeat(io, roomId);
      resetInactivityTimer(io, roomId);

      io.to(roomId).emit("trip-resumed", { roomId });
      console.log(`[resume-trip-control] Room ${roomId} resumed`);

      if (typeof ack === "function") ack({ ok: true });
    });

    // ----------------------------------------------------------------
    // 2d. Driver ends the trip entirely - tears down the room state.
    // ----------------------------------------------------------------
    socket.on("end-trip", ({ roomId } = {}, ack) => {
      if (!roomId) {
        if (typeof ack === "function") ack({ ok: false, error: "roomId is required" });
        return;
      }
      destroyTrip(io, roomId);
      if (typeof ack === "function") ack({ ok: true });
    });

    // ----------------------------------------------------------------
    // 3. Location update from driver app
    // ----------------------------------------------------------------
    socket.on("update-location", (data = {}) => {
      const { roomId, latitude, longitude, speed = 0, accuracy = null } = data;
      if (!roomId || latitude == null || longitude == null) return;

      const trip = getOrCreateTrip(roomId);

      trip.lastLocation = { latitude, longitude };
      trip.speed = speed;
      trip.gpsAccuracy = accuracy;
      trip.lastUpdated = new Date();
      trip.isLive = true;
      trip.tripStatus = "active";
      trip.driverSocketId = socket.id;

      resetInactivityTimer(io, roomId);

      io.to(roomId).emit("location-broadcast", {
        roomId,
        latitude,
        longitude,
        speed,
        accuracy,
        lastUpdated: trip.lastUpdated,
        viewerCount: getViewerCount(roomId),
        isHeartbeat: false,
      });
    });

    // ----------------------------------------------------------------
    // 3b. Driver heartbeat - proves the app is alive even without GPS
    //     movement. Kept separate from update-location so the student
    //     app can distinguish "offline" vs "no GPS fix" vs "poor internet".
    // ----------------------------------------------------------------
    socket.on("driver-heartbeat", ({ roomId, batteryLevel, gpsAccuracy } = {}) => {
      const trip = activeTrips.get(roomId);
      if (!trip) return;

      trip.lastHeartbeat = new Date();
      if (batteryLevel != null) trip.batteryLevel = batteryLevel;
      if (gpsAccuracy != null) trip.gpsAccuracy = gpsAccuracy;

      if (trip.tripStatus !== "paused") {
        resetInactivityTimer(io, roomId);
      }
    });

    // ----------------------------------------------------------------
    // 3c. Optional: driver updates seats-available / occupancy
    // ----------------------------------------------------------------
    socket.on("update-occupancy", ({ roomId, seatsAvailable } = {}) => {
      const trip = activeTrips.get(roomId);
      if (!trip || seatsAvailable == null) return;

      trip.seatsAvailable = seatsAvailable;
      io.to(roomId).emit("occupancy-update", { roomId, seatsAvailable });
    });

    // ----------------------------------------------------------------
    // 4. Get viewer list on demand
    // ----------------------------------------------------------------
    socket.on("get-viewers", (roomId, ack) => {
      const list = getViewerList(roomId);
      if (typeof ack === "function") {
        ack({ ok: true, roomId, viewers: list, count: list.length });
      } else {
        socket.emit("viewer-list", { roomId, viewers: list, count: list.length });
      }
    });

    // ----------------------------------------------------------------
    // 5. Driver stops sharing -> clear active trip (DRIVER ONLY!)
    //    Kept for backward compatibility; `end-trip` is the preferred
    //    event going forward since it has an ack callback.
    // ----------------------------------------------------------------
    socket.on("stop-sharing", (roomId) => {
      if (!roomId) return;
      destroyTrip(io, roomId);
    });

    // ----------------------------------------------------------------
    // 5b. Viewer leaves room WITHOUT ending the trip for others
    // ----------------------------------------------------------------
    socket.on("leave-room", (roomId) => {
      if (!roomId) return;
      socket.leave(roomId);

      const trip = activeTrips.get(roomId);
      if (trip) {
        trip.viewers.delete(socket.id);
        broadcastViewerCount(io, roomId);
      }

      console.log(`[leave-room] ${socket.id} left room ${roomId}`);
    });

    // ----------------------------------------------------------------
    // 6. Disconnect handling + driver reconnection recovery
    // ----------------------------------------------------------------
    socket.on("disconnecting", () => {
      const { roomId, role, driverId } = socket.data;
      if (!roomId) return;

      const trip = activeTrips.get(roomId);
      if (!trip) return;

      trip.viewers.delete(socket.id);
      broadcastViewerCount(io, roomId);

      if (role === "driver" && trip.driverSocketId === socket.id) {
        console.log(`[disconnecting] Driver socket ${socket.id} left room ${roomId}, awaiting recovery...`);

        setTimeout(() => {
          const current = activeTrips.get(roomId);
          if (!current) return;

          if (current.driverSocketId !== socket.id) return;
          if (current.tripStatus === "paused") return; // paused trips shouldn't flip to offline

          current.isLive = false;
          io.to(roomId).emit("driver-offline", { roomId, reason: "disconnected" });
          console.log(`[Recovery Timeout] Driver did not reconnect for room ${roomId}.`);
        }, 10 * 1000);
      }
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected:", socket.id);
    });

    // ----------------------------------------------------------------
    // 7. Explicit driver reconnect (disconnect-recovery, e.g. app was
    //    killed/network dropped and relaunched) - distinct from
    //    resume-trip-control which is a deliberate pause/resume action.
    // ----------------------------------------------------------------
    socket.on("resume-trip", ({ driverId } = {}, ack) => {
      const roomId = driverRoomMap.get(String(driverId));
      const trip = roomId ? activeTrips.get(roomId) : null;

      if (!trip) {
        if (typeof ack === "function") ack({ ok: false, error: "No active trip found" });
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = "driver";
      socket.data.driverId = driverId;

      trip.driverSocketId = socket.id;
      trip.isLive = true;
      if (trip.tripStatus !== "paused") trip.tripStatus = "active";

      resetInactivityTimer(io, roomId);
      io.to(roomId).emit("driver-online", {
        roomId,
        driverInfo: trip.driverInfo,
        busInfo: trip.busInfo,
      });

      console.log(`[resume-trip] Driver ${driverId} resumed trip on room ${roomId}`);

      if (typeof ack === "function") {
        ack({ ok: true, roomId, driverInfo: trip.driverInfo, busInfo: trip.busInfo });
      }
    });
  }); // <-- io.on("connection", ...) closes here

  // ------------------------------------------------------------------
  // Periodic sweep: remove stale trips
  // ------------------------------------------------------------------
  setInterval(() => {
    for (const [roomId, trip] of activeTrips.entries()) {
      const room = io.sockets.adapter.rooms.get(roomId);
      const actualCount = room ? room.size : 0;

      if (actualCount === 0) {
        console.log(`[Sweep] Room ${roomId} has no sockets left, cleaning up.`);
        destroyTrip(io, roomId, { notify: false });
        continue;
      }

      for (const socketId of trip.viewers.keys()) {
        if (!io.sockets.sockets.get(socketId)) {
          trip.viewers.delete(socketId);
        }
      }

      const staleForTooLong =
        trip.tripStatus !== "paused" &&
        !trip.isLive &&
        trip.lastUpdated &&
        Date.now() - new Date(trip.lastUpdated).getTime() > 5 * 60 * 1000;

      if (staleForTooLong) {
        console.log(`[Sweep] Room ${roomId} stale for 5+ min, removing.`);
        destroyTrip(io, roomId);
      }
    }
  }, STALE_SOCKET_SWEEP_INTERVAL);
};

module.exports = {
  socketHandler,
  attachAuthMiddleware,
  activeTrips,
  driverRoomMap,
  getViewerList,
  getViewerCount,
  toSafeTrip,
};