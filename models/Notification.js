const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
  title: String,
  body: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  screen: String, // কোন স্ক্রিনে যাবে (tracking/schedule)
  dataId: String, // বাসের আইডি বা ট্রিপ আইডি
  isRead: { type: Boolean, default: false }, // আনরিড ডট দেখানোর জন্য
  sentAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);