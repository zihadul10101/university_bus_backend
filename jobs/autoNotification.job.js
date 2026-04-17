const cron = require("node-cron");
const User = require("../models/User");
const notificationService = require("../services/notification.service");

cron.schedule("*/1 * * * *", async () => {
  const users = await User.find({ role: "student" });

  const tokens = users.map(u => u.fcmToken).filter(Boolean);

  if (tokens.length) {
    await notificationService.sendToMultiple(
      tokens,
      "Bus Alert",
      "Bus is arriving soon 🚍"
    );
  }
});