// // /**
// //  * socketHandler.js
// //  * ---------------------------------------------------------------
// //  * Campus Bus Live Tracking - Socket.IO v4 handler
// //  * ---------------------------------------------------------------
// //  */

// // const Driver = require("../models/Driver"); // adjust path
// // const Bus = require("../models/Bus"); // adjust path

// // // ------------------------------------------------------------------
// // // In-memory state
// // // ------------------------------------------------------------------

// // const activeTrips = new Map();
// // const driverRoomMap = new Map();

// // const LOCATION_BROADCAST_INTERVAL = 10 * 1000;
// // const DRIVER_INACTIVITY_TIMEOUT = 30 * 1000;
// // const STALE_SOCKET_SWEEP_INTERVAL = 20 * 1000;

// // // ------------------------------------------------------------------
// // // Helpers - DB fetch
// // // ------------------------------------------------------------------

// // async function fetchDriverInfo(driverId) {
// //   try {
// //     const driver = await Driver.findById(driverId)
// //       .select("name phone photo licenseNo")
// //       .lean();
// //     return driver || null;
// //   } catch (err) {
// //     console.error("[socketHandler] fetchDriverInfo error:", err.message);
// //     return null;
// //   }
// // }

// // async function fetchBusInfo(busId) {
// //   try {
// //     const bus = await Bus.findById(busId)
// //       .populate("driverId", "name phone photo")
// //       .select("busName busNo driverId")
// //       .lean();
// //     return bus || null;
// //   } catch (err) {
// //     console.error("[socketHandler] fetchBusInfo error:", err.message);
// //     return null;
// //   }
// // }

// // // ------------------------------------------------------------------
// // // Helpers - room/trip state
// // // ------------------------------------------------------------------

// // function getOrCreateTrip(roomId) {
// //   if (!activeTrips.has(roomId)) {
// //     activeTrips.set(roomId, {
// //       busId: roomId,
// //       driverId: null,
// //       driverInfo: null,
// //       busInfo: null,
// //       lastLocation: null,
// //       speed: 0,
// //       lastUpdated: null,
// //       isLive: false,
// //       driverSocketId: null,
// //       viewers: new Map(),
// //       broadcastInterval: null,
// //       inactivityTimer: null,
// //     });
// //   }
// //   return activeTrips.get(roomId);
// // }

// // function getViewerList(roomId) {
// //   const trip = activeTrips.get(roomId);
// //   if (!trip) return [];
// //   return Array.from(trip.viewers.entries()).map(([socketId, info]) => ({
// //     socketId,
// //     ...info,
// //   }));
// // }

// // function getViewerCount(roomId) {
// //   const trip = activeTrips.get(roomId);
// //   return trip ? trip.viewers.size : 0;
// // }

// // function clearTripTimers(trip) {
// //   if (trip.broadcastInterval) {
// //     clearInterval(trip.broadcastInterval);
// //     trip.broadcastInterval = null;
// //   }
// //   if (trip.inactivityTimer) {
// //     clearTimeout(trip.inactivityTimer);
// //     trip.inactivityTimer = null;
// //   }
// // }

// // function destroyTrip(io, roomId, { notify = true } = {}) {
// //   const trip = activeTrips.get(roomId);
// //   if (!trip) return;

// //   clearTripTimers(trip);

// //   if (trip.driverId) {
// //     driverRoomMap.delete(String(trip.driverId));
// //   }

// //   if (notify) {
// //     io.to(roomId).emit("driver-offline", { roomId });
// //     io.to(roomId).emit("trip-ended", { roomId });
// //   }

// //   activeTrips.delete(roomId);
// //   console.log(`[Trip Ended] Room ${roomId} removed from memory.`);
// // }

// // function startBroadcastHeartbeat(io, roomId) {
// //   const trip = activeTrips.get(roomId);
// //   if (!trip) return;

// //   if (trip.broadcastInterval) clearInterval(trip.broadcastInterval);

// //   trip.broadcastInterval = setInterval(() => {
// //     const current = activeTrips.get(roomId);
// //     if (!current || !current.isLive || !current.lastLocation) return;

// //     io.to(roomId).emit("location-broadcast", {
// //       roomId,
// //       latitude: current.lastLocation.latitude,
// //       longitude: current.lastLocation.longitude,
// //       speed: current.speed,
// //       lastUpdated: current.lastUpdated,
// //       viewerCount: getViewerCount(roomId),
// //       isHeartbeat: true,
// //     });
// //   }, LOCATION_BROADCAST_INTERVAL);
// // }

// // function resetInactivityTimer(io, roomId) {
// //   const trip = activeTrips.get(roomId);
// //   if (!trip) return;

// //   if (trip.inactivityTimer) clearTimeout(trip.inactivityTimer);

// //   trip.inactivityTimer = setTimeout(() => {
// //     const current = activeTrips.get(roomId);
// //     if (!current) return;

// //     current.isLive = false;
// //     io.to(roomId).emit("driver-offline", { roomId, reason: "inactive" });
// //     console.log(`[Inactivity] Driver on room ${roomId} marked offline.`);
// //   }, DRIVER_INACTIVITY_TIMEOUT);
// // }

// // function broadcastViewerCount(io, roomId) {
// //   io.to(roomId).emit("viewer-count", { roomId, count: getViewerCount(roomId) });
// // }

// // function toSafeTrip(trip) {
// //   if (!trip) return null;
// //   const { broadcastInterval, inactivityTimer, viewers, ...safe } = trip;
// //   return {
// //     ...safe,
// //     viewerCount: viewers ? viewers.size : 0,
// //   };
// // }

// // // ------------------------------------------------------------------
// // // Main handler
// // // ------------------------------------------------------------------

// // const socketHandler = (io) => {
// //   io.on("connection", (socket) => {
// //     console.log("[Socket] Connected:", socket.id);

// //     socket.data.roomId = null;
// //     socket.data.role = null;
// //     socket.data.userId = null;
// //     socket.data.driverId = null;

// //     // ----------------------------------------------------------------
// //     // 1. Join room - used by Student / Admin / Driver alike
// //     // ----------------------------------------------------------------
// //     socket.on("join-room", async ({ roomId, role = "student", userId = null } = {}) => {
// //       if (!roomId) return;

// //       socket.join(roomId);
// //       socket.data.roomId = roomId;
// //       socket.data.role = role;
// //       socket.data.userId = userId;

// //       const trip = getOrCreateTrip(roomId);

// //       trip.viewers.set(socket.id, {
// //         userId,
// //         role,
// //         joinedAt: new Date(),
// //       });

// //       console.log(`[join-room] ${role} (${socket.id}) joined room ${roomId}`);

// //       socket.emit("trip-snapshot", {
// //         roomId,
// //         driverInfo: trip.driverInfo,
// //         busInfo: trip.busInfo,
// //         lastLocation: trip.lastLocation,
// //         speed: trip.speed,
// //         lastUpdated: trip.lastUpdated,
// //         isLive: trip.isLive,
// //         viewerCount: getViewerCount(roomId),
// //       });

// //       broadcastViewerCount(io, roomId);
// //     });

// //     // ----------------------------------------------------------------
// //     // 2. Driver starts live tracking
// //     // ----------------------------------------------------------------
// //     socket.on("start-trip", async ({ roomId, driverId } = {}, ack) => {
// //       if (!roomId || !driverId) {
// //         if (typeof ack === "function") ack({ ok: false, error: "roomId and driverId are required" });
// //         return;
// //       }

// //       try {
// //         socket.join(roomId);
// //         socket.data.roomId = roomId;
// //         socket.data.role = "driver";
// //         socket.data.driverId = driverId;

// //         const trip = getOrCreateTrip(roomId);

// //         const [driverInfo, busInfo] = await Promise.all([
// //           fetchDriverInfo(driverId),
// //           fetchBusInfo(roomId),
// //         ]);

// //         trip.driverId = driverId;
// //         trip.driverInfo = driverInfo;
// //         trip.busInfo = busInfo;
// //         trip.isLive = true;
// //         trip.driverSocketId = socket.id;

// //         driverRoomMap.set(String(driverId), roomId);

// //         startBroadcastHeartbeat(io, roomId);
// //         resetInactivityTimer(io, roomId);

// //         io.to(roomId).emit("driver-online", {
// //           roomId,
// //           driverInfo,
// //           busInfo,
// //         });

// //         console.log(`[start-trip] Driver ${driverId} started trip on room ${roomId}`);

// //         if (typeof ack === "function") {
// //           ack({ ok: true, driverInfo, busInfo });
// //         }
// //       } catch (err) {
// //         console.error("[start-trip] error:", err.message);
// //         if (typeof ack === "function") ack({ ok: false, error: "Failed to start trip" });
// //       }
// //     });

// //     // ----------------------------------------------------------------
// //     // 3. Location update from driver app
// //     // ----------------------------------------------------------------
// //     socket.on("update-location", (data = {}) => {
// //       const { roomId, latitude, longitude, speed = 0 } = data;
// //       if (!roomId || latitude == null || longitude == null) return;

// //       const trip = getOrCreateTrip(roomId);

// //       trip.lastLocation = { latitude, longitude };
// //       trip.speed = speed;
// //       trip.lastUpdated = new Date();
// //       trip.isLive = true;
// //       trip.driverSocketId = socket.id;

// //       resetInactivityTimer(io, roomId);

// //       io.to(roomId).emit("location-broadcast", {
// //         roomId,
// //         latitude,
// //         longitude,
// //         speed,
// //         lastUpdated: trip.lastUpdated,
// //         viewerCount: getViewerCount(roomId),
// //         isHeartbeat: false,
// //       });
// //     });

// //     // ----------------------------------------------------------------
// //     // 4. Get viewer list on demand
// //     // ----------------------------------------------------------------
// //     socket.on("get-viewers", (roomId, ack) => {
// //       const list = getViewerList(roomId);
// //       if (typeof ack === "function") {
// //         ack({ ok: true, roomId, viewers: list, count: list.length });
// //       } else {
// //         socket.emit("viewer-list", { roomId, viewers: list, count: list.length });
// //       }
// //     });

// //     // ----------------------------------------------------------------
// //     // 5. Driver stops sharing -> clear active trip (DRIVER ONLY!)
// //     // ----------------------------------------------------------------
// //     socket.on("stop-sharing", (roomId) => {
// //       if (!roomId) return;
// //       destroyTrip(io, roomId);
// //     });

// //     // ----------------------------------------------------------------
// //     // 5b. Viewer leaves room WITHOUT ending the trip for others
// //     // ----------------------------------------------------------------
// //     socket.on("leave-room", (roomId) => {
// //       if (!roomId) return;
// //       socket.leave(roomId);

// //       const trip = activeTrips.get(roomId);
// //       if (trip) {
// //         trip.viewers.delete(socket.id);
// //         broadcastViewerCount(io, roomId);
// //       }

// //       console.log(`[leave-room] ${socket.id} left room ${roomId}`);
// //     });

// //     // ----------------------------------------------------------------
// //     // 6. Disconnect handling + driver reconnection recovery
// //     // ----------------------------------------------------------------
// //     socket.on("disconnecting", () => {
// //       const { roomId, role, driverId } = socket.data;
// //       if (!roomId) return;

// //       const trip = activeTrips.get(roomId);
// //       if (!trip) return;

// //       trip.viewers.delete(socket.id);
// //       broadcastViewerCount(io, roomId);

// //       if (role === "driver" && trip.driverSocketId === socket.id) {
// //         console.log(`[disconnecting] Driver socket ${socket.id} left room ${roomId}, awaiting recovery...`);

// //         setTimeout(() => {
// //           const current = activeTrips.get(roomId);
// //           if (!current) return;

// //           if (current.driverSocketId !== socket.id) return;

// //           current.isLive = false;
// //           io.to(roomId).emit("driver-offline", { roomId, reason: "disconnected" });
// //           console.log(`[Recovery Timeout] Driver did not reconnect for room ${roomId}.`);
// //         }, 10 * 1000);
// //       }
// //     });

// //     socket.on("disconnect", () => {
// //       console.log("[Socket] Disconnected:", socket.id);
// //     });

// //     // ----------------------------------------------------------------
// //     // 7. Explicit driver reconnect (optional client-side call)
// //     // ----------------------------------------------------------------
// //     socket.on("resume-trip", ({ driverId } = {}, ack) => {
// //       const roomId = driverRoomMap.get(String(driverId));
// //       const trip = roomId ? activeTrips.get(roomId) : null;

// //       if (!trip) {
// //         if (typeof ack === "function") ack({ ok: false, error: "No active trip found" });
// //         return;
// //       }

// //       socket.join(roomId);
// //       socket.data.roomId = roomId;
// //       socket.data.role = "driver";
// //       socket.data.driverId = driverId;

// //       trip.driverSocketId = socket.id;
// //       trip.isLive = true;

// //       resetInactivityTimer(io, roomId);
// //       io.to(roomId).emit("driver-online", {
// //         roomId,
// //         driverInfo: trip.driverInfo,
// //         busInfo: trip.busInfo,
// //       });

// //       console.log(`[resume-trip] Driver ${driverId} resumed trip on room ${roomId}`);

// //       if (typeof ack === "function") {
// //         ack({ ok: true, roomId, driverInfo: trip.driverInfo, busInfo: trip.busInfo });
// //       }
// //     });
// //   }); // <-- io.on("connection", ...) ক্লোজ হচ্ছে এখানে

// //   // ------------------------------------------------------------------
// //   // Periodic sweep: remove stale trips
// //   // ------------------------------------------------------------------
// //   setInterval(() => {
// //     for (const [roomId, trip] of activeTrips.entries()) {
// //       const room = io.sockets.adapter.rooms.get(roomId);
// //       const actualCount = room ? room.size : 0;

// //       if (actualCount === 0) {
// //         console.log(`[Sweep] Room ${roomId} has no sockets left, cleaning up.`);
// //         destroyTrip(io, roomId, { notify: false });
// //         continue;
// //       }

// //       for (const socketId of trip.viewers.keys()) {
// //         if (!io.sockets.sockets.get(socketId)) {
// //           trip.viewers.delete(socketId);
// //         }
// //       }

// //       const staleForTooLong =
// //         !trip.isLive &&
// //         trip.lastUpdated &&
// //         Date.now() - new Date(trip.lastUpdated).getTime() > 5 * 60 * 1000;

// //       if (staleForTooLong) {
// //         console.log(`[Sweep] Room ${roomId} stale for 5+ min, removing.`);
// //         destroyTrip(io, roomId);
// //       }
// //     }
// //   }, STALE_SOCKET_SWEEP_INTERVAL);
// // };

// // module.exports = {
// //   socketHandler,
// //   activeTrips,
// //   getViewerList,
// //   getViewerCount,
// //   toSafeTrip,
// // };


// /**
//  * socketHandler.js
//  * ---------------------------------------------------------------
//  * Campus Bus Live Tracking - Socket.IO v4 handler
//  * FIXED: auth checks on update-location/stop-sharing, phantom-trip
//  * prevention, resume-trip now carries last known location.
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

// // FIX #1 & #2: shared guard — only the socket currently registered as
// // this trip's driver may control it (update location / stop it).
// function isAuthorizedDriverSocket(trip, socket) {
//   if (!trip) return false;
//   return trip.driverSocketId === socket.id;
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
//     //    FIX #1 + #3: only the registered driver socket may push
//     //    location, and we never auto-create a trip here anymore.
//     // ----------------------------------------------------------------
//     socket.on("update-location", (data = {}) => {
//       const { roomId, latitude, longitude, speed = 0 } = data;
//       if (!roomId || latitude == null || longitude == null) return;

//       const trip = activeTrips.get(roomId);
//       if (!trip) {
//         // no start-trip was ever called for this room — ignore
//         return;
//       }

//       if (!isAuthorizedDriverSocket(trip, socket)) {
//         console.warn(
//           `[update-location] REJECTED - socket ${socket.id} is not the driver of room ${roomId}`
//         );
//         return;
//       }

//       trip.lastLocation = { latitude, longitude };
//       trip.speed = speed;
//       trip.lastUpdated = new Date();
//       trip.isLive = true;

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
//     //    FIX #2: verify caller actually owns this trip.
//     // ----------------------------------------------------------------
//     socket.on("stop-sharing", (roomId) => {
//       if (!roomId) return;

//       const trip = activeTrips.get(roomId);
//       if (!trip) return;

//       if (!isAuthorizedDriverSocket(trip, socket)) {
//         console.warn(
//           `[stop-sharing] REJECTED - socket ${socket.id} is not the driver of room ${roomId}`
//         );
//         return;
//       }

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
//     //    FIX #4: now carries lastLocation + fires an immediate
//     //    location-broadcast so viewers' maps don't stay frozen.
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
//         lastLocation: trip.lastLocation,
//         speed: trip.speed,
//         lastUpdated: trip.lastUpdated,
//       });

//       // Immediately re-sync viewers with the last known position
//       // instead of waiting for the next GPS tick.
//       if (trip.lastLocation) {
//         io.to(roomId).emit("location-broadcast", {
//           roomId,
//           latitude: trip.lastLocation.latitude,
//           longitude: trip.lastLocation.longitude,
//           speed: trip.speed,
//           lastUpdated: trip.lastUpdated,
//           viewerCount: getViewerCount(roomId),
//           isHeartbeat: true,
//         });
//       }

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
 * FIXED (this pass):
 *  - REST fallback support: applyLocationUpdate() + verifyTripOwnership()
 *    exported so the HTTP controller can push a location update when the
 *    driver app's background task can't reach the socket (headless JS).
 *  - start-trip now verifies the driverId actually owns this bus in the DB,
 *    instead of trusting whatever driverId the client sends.
 *  - toSafeTrip() no longer leaks internal socket ids to public API responses.
 * ---------------------------------------------------------------
 */

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

// ✅ NEW: io কে module scope এ ধরে রাখা হচ্ছে, যাতে REST controller থেকে
// (যেখানে socket instance নেই) io.to(roomId).emit(...) কল করা যায়।
let ioRef = null;

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
      .select("busName busNo driverId")
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
      driverSocketId: null,
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

// shared guard — only the socket currently registered as this trip's
// driver may control it (update location / stop it) over the socket path.
function isAuthorizedDriverSocket(trip, socket) {
  if (!trip) return false;
  return trip.driverSocketId === socket.id;
}

// ✅ NEW: REST path এর জন্য guard — এখানে socket.id নেই, তাই driverId
// দিয়ে verify করা হয় (trip টা যে driverId এর নামে start হয়েছিল, request
// এ পাঠানো driverId তার সাথে মিলছে কিনা)।
// ⚠️ এটা এখনো socket-level auth এর মতো strong না — production এ এই রুটে
// JWT/Bearer token verify করে req.user.id === driverId চেক করাটা জরুরি,
// নাহলে driverId জানা যেকেউ ভুয়া লোকেশন পুশ করতে পারবে।
function verifyTripOwnership(roomId, driverId) {
  const trip = activeTrips.get(roomId);
  if (!trip || !trip.driverId) return false;
  return String(trip.driverId) === String(driverId);
}

// ✅ NEW: socket 'update-location' এবং REST '/location/update' — দুটো পথই
// এই একই ফাংশন কল করবে, যাতে লজিক duplicate না হয় এবং দুই পথের আচরণ
// (broadcast payload shape, inactivity reset ইত্যাদি) সবসময় sync থাকে।
function applyLocationUpdate(roomId, { latitude, longitude, speed = 0 } = {}) {
  if (!ioRef) return { ok: false, error: "Socket server not ready" };
  if (latitude == null || longitude == null) {
    return { ok: false, error: "latitude and longitude are required" };
  }

  const trip = activeTrips.get(roomId);
  if (!trip) {
    return { ok: false, error: "No active trip found for this room" };
  }

  trip.lastLocation = { latitude, longitude };
  trip.speed = speed;
  trip.lastUpdated = new Date();
  trip.isLive = true;

  resetInactivityTimer(ioRef, roomId);

  ioRef.to(roomId).emit("location-broadcast", {
    roomId,
    latitude,
    longitude,
    speed,
    lastUpdated: trip.lastUpdated,
    viewerCount: getViewerCount(roomId),
    isHeartbeat: false,
  });

  return { ok: true };
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

    current.isLive = false;
    io.to(roomId).emit("driver-offline", { roomId, reason: "inactive" });
    console.log(`[Inactivity] Driver on room ${roomId} marked offline.`);
  }, DRIVER_INACTIVITY_TIMEOUT);
}

function broadcastViewerCount(io, roomId) {
  io.to(roomId).emit("viewer-count", { roomId, count: getViewerCount(roomId) });
}

// ✅ FIX: driverSocketId আর broadcastInterval/inactivityTimer/viewers এর
// মতোই বাদ দেওয়া হচ্ছে — এটা internal socket id, public API response
// (getAllLiveRooms/getRoomStatus) এ এক্সপোজ করার দরকার নেই।
function toSafeTrip(trip) {
  if (!trip) return null;
  const { broadcastInterval, inactivityTimer, viewers, driverSocketId, ...safe } = trip;
  return {
    ...safe,
    viewerCount: viewers ? viewers.size : 0,
  };
}

// ------------------------------------------------------------------
// Main handler
// ------------------------------------------------------------------

const socketHandler = (io) => {
  ioRef = io;

  io.on("connection", (socket) => {
    console.log("[Socket] Connected:", socket.id);

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
        viewerCount: getViewerCount(roomId),
      });

      broadcastViewerCount(io, roomId);
    });

    // ----------------------------------------------------------------
    // 2. Driver starts live tracking
    //    ✅ FIX: driverId ↔ roomId ownership এখন DB এর বিপরীতে verify করা
    //    হচ্ছে। আগে যেকোনো socket, যেকোনো driverId + roomId পাঠিয়ে সেই
    //    বাসের trip "start" করে ফেলতে পারতো — এটা হাইজ্যাক করার সুযোগ ছিল।
    // ----------------------------------------------------------------
    socket.on("start-trip", async ({ roomId, driverId } = {}, ack) => {
      if (!roomId || !driverId) {
        if (typeof ack === "function") ack({ ok: false, error: "roomId and driverId are required" });
        return;
      }

      try {
        const [driverInfo, busInfo] = await Promise.all([
          fetchDriverInfo(driverId),
          fetchBusInfo(roomId),
        ]);

        if (!busInfo) {
          if (typeof ack === "function") ack({ ok: false, error: "Bus not found" });
          return;
        }

        const assignedDriverId = busInfo.driverId?._id
          ? String(busInfo.driverId._id)
          : busInfo.driverId
          ? String(busInfo.driverId)
          : null;

        if (!assignedDriverId || assignedDriverId !== String(driverId)) {
          console.warn(
            `[start-trip] REJECTED - driver ${driverId} is not assigned to bus ${roomId}`
          );
          if (typeof ack === "function") {
            ack({ ok: false, error: "This driver is not assigned to this bus" });
          }
          return;
        }

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.role = "driver";
        socket.data.driverId = driverId;

        const trip = getOrCreateTrip(roomId);

        trip.driverId = driverId;
        trip.driverInfo = driverInfo;
        trip.busInfo = busInfo;
        trip.isLive = true;
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
    // 3. Location update from driver app (socket path)
    //    only the registered driver socket may push location.
    // ----------------------------------------------------------------
    socket.on("update-location", (data = {}) => {
      const { roomId, latitude, longitude, speed = 0 } = data;
      if (!roomId) return;

      const trip = activeTrips.get(roomId);
      if (!trip) return; // no start-trip was ever called for this room — ignore

      if (!isAuthorizedDriverSocket(trip, socket)) {
        console.warn(
          `[update-location] REJECTED - socket ${socket.id} is not the driver of room ${roomId}`
        );
        return;
      }

      applyLocationUpdate(roomId, { latitude, longitude, speed });
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
    // ----------------------------------------------------------------
    socket.on("stop-sharing", (roomId) => {
      if (!roomId) return;

      const trip = activeTrips.get(roomId);
      if (!trip) return;

      if (!isAuthorizedDriverSocket(trip, socket)) {
        console.warn(
          `[stop-sharing] REJECTED - socket ${socket.id} is not the driver of room ${roomId}`
        );
        return;
      }

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
      const { roomId, role } = socket.data;
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
    // 7. Explicit driver reconnect (optional client-side call)
    //    carries lastLocation + fires an immediate location-broadcast so
    //    viewers' maps don't stay frozen.
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

      resetInactivityTimer(io, roomId);

      io.to(roomId).emit("driver-online", {
        roomId,
        driverInfo: trip.driverInfo,
        busInfo: trip.busInfo,
        lastLocation: trip.lastLocation,
        speed: trip.speed,
        lastUpdated: trip.lastUpdated,
      });

      if (trip.lastLocation) {
        io.to(roomId).emit("location-broadcast", {
          roomId,
          latitude: trip.lastLocation.latitude,
          longitude: trip.lastLocation.longitude,
          speed: trip.speed,
          lastUpdated: trip.lastUpdated,
          viewerCount: getViewerCount(roomId),
          isHeartbeat: true,
        });
      }

      console.log(`[resume-trip] Driver ${driverId} resumed trip on room ${roomId}`);

      if (typeof ack === "function") {
        ack({ ok: true, roomId, driverInfo: trip.driverInfo, busInfo: trip.busInfo });
      }
    });
  }); // <-- io.on("connection", ...) ক্লোজ হচ্ছে এখানে

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
  activeTrips,
  getViewerList,
  getViewerCount,
  toSafeTrip,
  applyLocationUpdate,
  verifyTripOwnership,
};