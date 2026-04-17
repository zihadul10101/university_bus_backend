const mongoose = require("mongoose");

const timeValidator = {
  validator: v => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
  message: props => `${props.value} is not valid (HH:mm)`
};

const TripSchema = new mongoose.Schema({
  tripTitle: { type: String, required: true },
  days: [{
    type: String,
    enum: ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"],
    required: true
  }],
  from: { stop: { type: String, required: true }, time: { type: String, required: true, validate: timeValidator } },
  to: { stop: { type: String, required: true }, time: { type: String, required: true, validate: timeValidator } },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ Embedded doc pre-hook
TripSchema.pre("save", async function () {
  if (this.from.time >= this.to.time) {
    throw new Error("From time must be before To time");
  }
});

const BusSchema = new mongoose.Schema({
  busNo: { type: String, required: true },
  busName: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  trips: [TripSchema]
}, { timestamps: true });

// ✅ Sort trips
BusSchema.pre("save", async function () {
  if (this.trips && this.trips.length) {
    this.trips.sort((a, b) => a.from.time.localeCompare(b.from.time));
  }
});

BusSchema.index({ busNo: 1 });
BusSchema.index({ "trips.days": 1 });

module.exports = mongoose.model("Bus", BusSchema);