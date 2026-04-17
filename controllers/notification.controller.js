const User = require("../models/User");
const notificationService = require("../services/notification.service");


// 🔹 Send to single user
exports.sendToUser = async (req, res) => {
  try {
    const { userId, title, body } = req.body;

    const user = await User.findById(userId);

    if (!user || !user.fcmToken) {
      return res.status(404).json({
        success: false,
        message: "User or token not found"
      });
    }

    await notificationService.sendToToken(
      user.fcmToken,
      title,
      body
    );

    res.json({
      success: true,
      message: "Notification sent to user"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🔹 Send to all users
exports.sendToAllUsers = async (req, res) => {
  try {
    const { title, body } = req.body;

    const users = await User.find({
      fcmToken: { $exists: true, $ne: null }
    });

    const tokens = users
      .map(u => u.fcmToken)
      .filter(Boolean);

    if (!tokens.length) {
      return res.status(400).json({
        success: false,
        message: "No tokens found"
      });
    }

    const response = await notificationService.sendToMultiple(
      tokens,
      title,
      body
    );

    res.json({
      success: true,
      total: tokens.length,
      success: response.successCount,
      failed: response.failureCount
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🔹 Save FCM token (User login হলে call করবে)
exports.saveToken = async (req, res) => {
  try {
    const { token } = req.body;

    await User.findByIdAndUpdate(req.user.id, {
      fcmToken: token
    });

    res.json({
      success: true,
      message: "Token saved"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};