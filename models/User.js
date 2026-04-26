const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  role: {
    type: String,
    enum: ["student", "driver", "super_admin","sub_admin"],
  },
  fcmToken: String,
});

module.exports = mongoose.model("User", userSchema);

