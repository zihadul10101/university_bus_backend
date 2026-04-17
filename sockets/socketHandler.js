
module.exports = (io) => {
  // একটি হেল্পার ফাংশন যা রুমে কতজন আছে তা সবাইকে জানিয়ে দেবে
  const updateViewerCount = (roomId) => {
    const count = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    // ওই নির্দিষ্ট রুমের সবাইকে (Host + Viewers) সংখ্যাটি পাঠানো
    io.to(roomId).emit('viewer-count', count);
    console.log(`Room: ${roomId} | Active Viewers: ${count}`);
  };

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // ১. রুমে জয়েন করা
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
      
      // কেউ জয়েন করার সাথে সাথে আপডেট পাঠানো
      updateViewerCount(roomId);
    });

    // ২. লোকেশন আপডেট (Host থেকে ভিউয়ারদের কাছে)
    socket.on("update-location", (data) => {
      // data = { roomId: '...', latitude: ..., longitude: ... }
      socket.to(data.roomId).emit("location-broadcast", data);
    });

    // ৩. ইউজার ডিসকানেক্ট হওয়ার সময় (খুবই গুরুত্বপূর্ণ)
    socket.on("disconnecting", () => {
      // ইউজার কোন কোন রুমে ছিল তা খুঁজে বের করা
      socket.rooms.forEach((roomId) => {
        if (roomId !== socket.id) {
          // ইউজার পুরোপুরি বেরিয়ে যাওয়ার পর আপডেট পাঠানোর জন্য সামান্য দেরি করা
          setTimeout(() => updateViewerCount(roomId), 200);
        }
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};