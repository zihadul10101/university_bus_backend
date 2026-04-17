const { rooms } = require("../sockets/socketHandler");

exports.getRoomStatus = (req, res) => {
  const { roomId } = req.params;

  const room = rooms[roomId];

  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found"
    });
  }

  res.status(200).json({
    success: true,
    roomId,
    usersConnected: room.users,
    lastLocation: room.lastLocation,
    lastUpdated: room.lastUpdated
  });
};