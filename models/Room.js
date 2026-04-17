// এটি মূলত একটি ব্লু-প্রিন্ট
class Room {
    constructor(roomId, hostId) {
        this.roomId = roomId;
        this.hostId = hostId;
        this.currentLocation = { lat: 0, lng: 0 };
        this.viewersCount = 0;
    }
}
module.exports = Room;