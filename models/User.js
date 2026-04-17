const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  role: {
    type: String,
    enum: ["student", "driver", "admin"],
  },
  fcmToken: String,
});

module.exports = mongoose.model("User", userSchema);

