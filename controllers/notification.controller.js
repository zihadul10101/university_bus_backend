const User = require("../models/User");
const Notification = require("../models/Notification"); // মডেল ইম্পোর্ট করুন
const notificationService = require("../services/notification.service");

exports.sendToUser = async (req, res) => {
  try {
    const { userId, title, body, screen, dataId } = req.body; // screen এবং dataId যোগ করা হয়েছে

    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      return res.status(404).json({ success: false, message: "User or token not found" });
    }

    // database notification save 

    const newNotification = await Notification.create({
      title,
      body,
      userId,
      screen, // উদা: 'LIVE_TRACK'
      dataId, // উদা: 'bus_104'
    });

    // ২. FCM এর মাধ্যমে পাঠান
    await notificationService.sendToToken(
      user.fcmToken,
      title,
      body,
      { screen, dataId } // পেলোড হিসেবে পাঠানো হচ্ছে
    );

    res.json({ success: true, data: newNotification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getNotifications = async (req, res) => {
  try {
    // কুয়েরি থেকে পেজ এবং লিমিট নেওয়া (ডিফল্ট: page 1, limit 10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ sentAt: -1 }) // লেটেস্ট নোটিফিকেশন আগে দেখাবে
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ userId: req.user.id });

    res.json({
      success: true,
      data: notifications,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNotifications: total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    // নির্দিষ্ট নোটিফিকেশনকে 'read' হিসেবে চিহ্নিত করা
    await Notification.findByIdAndUpdate(id, { isRead: true });

    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};