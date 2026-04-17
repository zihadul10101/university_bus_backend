const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  title: String,
  body: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);