const mongoose = require('mongoose');
const Bus = require('../models/Bus');
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // 🔥 Sync indexes (THIS FIXES YOUR ERROR)
    await Bus.syncIndexes();
    console.log("✅ Bus indexes synced");

  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;