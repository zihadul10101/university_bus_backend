
const mongoose = require("mongoose");

// ১২ ঘণ্টার ফরম্যাট ভ্যালিডেটর (null বা ফাঁকা ভ্যালুকে স্কিপ করবে)
const timeValidator = {
  validator: v => {
    if (v === null || v === undefined || v === "") return true;
    // কোলন (:) দিয়ে ১২ ঘণ্টার AM/PM ফরম্যাট চেক করার জন্য স্ট্যান্ডার্ড রেজেক্স
    return /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i.test(v);
  },
  message: props => `${props.value} সঠিক ১২ ঘণ্টার সময় ফরম্যাট (ex: 7:20 AM, 02:40 PM) নয়!`
};

// ১২ ঘণ্টার সময়কে তুলনা বা সর্ট করার জন্য সাময়িকভাবে ২৪ ঘণ্টায় রূপান্তর করার হেল্পার ফাংশন
const convertTo24Hour = (timeStr) => {
  if (!timeStr) return "00:00";
  
  let match = timeStr.toUpperCase().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/);
  if (!match) return "00:00";

  let [_, hours, minutes, modifier] = match;
  let hoursInt = parseInt(hours, 10);

  if (modifier === "PM" && hoursInt < 12) hoursInt += 12;
  if (modifier === "AM" && hoursInt === 12) hoursInt = 0;

  return `${hoursInt.toString().padStart(2, "0")}:${minutes}`;
};

// প্রতিটি স্টপেজের জন্য সাব-স্কিমা
const StopSchema = new mongoose.Schema({
  stopName: { type: String, required: true },
  time: { type: String, validate: timeValidator, default: null }, 
  sequence: { type: Number, required: true }
}, { _id: false });

// ট্রিপ সাব-স্কিমা
const TripSchema = new mongoose.Schema({
  // ✅ tripTitle-এ আপনার ছবির লাল অংশের সম্পূর্ণ রুটটি বসবে (যেমন: "সাউদার্ন ইস্ট ক্যাম্পাস-২ নং গেইট-বহদ্দার হাট...")
  tripTitle: { type: String, required: true },
  days: [{
    type: String,
    enum: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    required: true
  }],
  stops: [StopSchema]
}, { 
  timestamps: true,
  strictPopulate: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ----------------- VIRTUALS -----------------
// প্রথম নির্ধারিত স্টপ এবং শেষ নির্ধারিত স্টপ সুন্দরভাবে রিটার্ন করবে
TripSchema.virtual("from").get(function () {
  if (this.stops && this.stops.length > 0) {
    // সিকোয়েন্স ফিল্টার করার পর প্রথম যে স্টপে টাইম আছে
    const timedStops = this.stops.filter(s => s.time);
    if (timedStops.length > 0) {
      return { stop: timedStops[0].stopName, time: timedStops[0].time };
    }
  }
  return null;
});

TripSchema.virtual("to").get(function () {
  if (this.stops && this.stops.length > 0) {
    const timedStops = this.stops.filter(s => s.time);
    if (timedStops.length > 0) {
      return { stop: timedStops[timedStops.length - 1].stopName, time: timedStops[timedStops.length - 1].time };
    }
  }
  return null;
});

// ----------------- PRE-HOOKS -----------------

TripSchema.pre("validate", async function () {
  if (this.stops && this.stops.length > 0) {
    // ১. ডাটাবেজে সেভ হওয়ার আগে সিকোয়েন্স অনুযায়ী স্টপগুলো সর্ট করে নেওয়া
    this.stops.sort((a, b) => a.sequence - b.sequence);

    // ২. লজিক্যাল ভ্যালিডেশন: শুরুর সময় যেন গন্তব্যের সময়ের চেয়ে বেশি না হয়
    const timedStops = this.stops.filter(s => s.time);
    
    if (timedStops.length >= 2) {
      const firstStop = timedStops[0];
      const lastStop = timedStops[timedStops.length - 1];

      const startTime24 = convertTo24Hour(firstStop.time);
      const endTime24 = convertTo24Hour(lastStop.time);

      if (startTime24 >= endTime24) {
        throw new Error(`Trip Validation Error: Trip start time (${firstStop.time}) must be before arrival time (${lastStop.time})`);
      }
    }
  }
});

// মেইন বাস স্কিমা
// const BusSchema = new mongoose.Schema({
//   busNo: { type: String, required: true, unique: true },
//   busName: { type: String, required: true },
//   trips: [TripSchema]
// }, { timestamps: true });

// মেইন বাস স্কিমা
const BusSchema = new mongoose.Schema({
  busNo: { type: String, required: true, unique: true },
  busName: { type: String, required: true },
  trips: [TripSchema],
  
  // 🎯 'driver' কেটে 'driverId' করে দেওয়া হলো
  driverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Driver", 
    default: null 
  }
}, { timestamps: true });

// বাসের সমস্ত ট্রিপগুলোকে দিনের শুরুর সময় (Chronological Order) অনুযায়ী সাজানো
BusSchema.pre("save", async function () {
  if (this.trips && this.trips.length > 0) {
    this.trips.sort((a, b) => {
      const aFirstStop = a.stops.find(s => s.time);
      const bFirstStop = b.stops.find(s => s.time);
      
      const aTime = aFirstStop ? aFirstStop.time : "00:00 AM";
      const bTime = bFirstStop ? bFirstStop.time : "00:00 AM";
      
      return convertTo24Hour(aTime).localeCompare(convertTo24Hour(bTime));
    });
  }
});

module.exports = mongoose.model("Bus", BusSchema);