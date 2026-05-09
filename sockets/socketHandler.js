// socketHandler.js
const rooms = {}; // গ্লোবাল অবজেক্ট যা সব একটিভ বাসের লোকেশন রাখবে

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // ১. রুমে জয়েন করা
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      
      if (!rooms[roomId]) {
        rooms[roomId] = { 
          lastLocation: null, 
          lastUpdated: null, 
          users: 0,
          isLive: true 
        };
      }
      
      const count = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      rooms[roomId].users = count;
      
      // নতুন কেউ জয়েন করলে তাকে বাসের শেষ লোকেশনটি সাথে সাথে পাঠিয়ে দিন
      if (rooms[roomId].lastLocation) {
        socket.emit("location-broadcast", {
          roomId,
          ...rooms[roomId].lastLocation,
          speed: rooms[roomId].speed,
          isInitialData: true // ফ্ল্যাগ যাতে ইউজার বুঝতে পারে এটি আগের লোকেশন
        });
      }
    });

    // ২. লোকেশন আপডেট রিসিভ এবং ব্রডকাস্ট
    // socket.on("update-location", (data) => {
    //   const { roomId, latitude, longitude, speed } = data;
      
    //   if (rooms[roomId]) {
    //     rooms[roomId].lastLocation = { latitude, longitude };
    //     rooms[roomId].speed = speed || 0;
    //     rooms[roomId].lastUpdated = new Date();
    //     rooms[roomId].isLive = true;
    //   }

    //   // বাসের আইডি বাদে সবাইকে লোকেশন পাঠিয়ে দিন
    //   socket.to(roomId).emit("location-broadcast", data);
    // });
    // ২. লোকেশন আপডেট রিসিভ এবং ব্রডকাস্ট
socket.on("update-location", (data) => {
  const { roomId, latitude, longitude, speed } = data;
  const currentTime = new Date().toLocaleTimeString();

  if (rooms[roomId]) {
    rooms[roomId].lastLocation = { latitude, longitude };
    rooms[roomId].speed = speed || 0;
    rooms[roomId].lastUpdated = new Date();
    rooms[roomId].isLive = true;
    
    // কনসোলে চেক করার জন্য:
    console.log(`[${currentTime}] Location for ${roomId}: Lat ${latitude}, Lon ${longitude}`);
  }

  // স্টুডেন্টদের ডাটা পাঠিয়ে দিন
  socket.to(roomId).emit("location-broadcast", data);
});

    // ৩. ড্রাইভার শেয়ারিং বন্ধ করলে (Custom Event)
    socket.on("stop-sharing", (roomId) => {
      if (rooms[roomId]) {
        rooms[roomId].isLive = false;
        socket.to(roomId).emit("driver-offline");
        // চাইলে রুমটি মেমোরি থেকে মুছে ফেলতে পারেন
        // delete rooms[roomId]; 
      }
    });

    // ৪. ডিসকানেক্ট হ্যান্ডলিং
    socket.on("disconnecting", () => {
      socket.rooms.forEach((roomId) => {
        if (rooms[roomId]) {
          setTimeout(() => {
            const count = io.sockets.adapter.rooms.get(roomId)?.size || 0;
            if (count === 0) {
              // রুম খালি হলে ডাটা মুছে ফেলা ভালো যাতে মেমোরি বেঁচে যায়
              delete rooms[roomId]; 
            } else {
              rooms[roomId].users = count;
              // যদি ড্রাইভার ডিসকানেক্ট হয় (যিনি হোস্ট), ইউজারদের জানান
              socket.to(roomId).emit("driver-offline");
            }
          }, 2000);
        }
      });
    });
  });
};

// একসাথে দুটিই এক্সপোর্ট করার সঠিক নিয়ম
module.exports = {
  socketHandler,
  rooms
};