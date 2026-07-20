// const mongoose = require("mongoose");

// // ১২ ঘণ্টার ফরম্যাট ভ্যালিডেটর (null বা ফাঁকা ভ্যালুকে স্কিপ করবে)
// const timeValidator = {
//   validator: v => {
//     if (v === null || v === undefined || v === "") return true;
//     // কোলন (:) দিয়ে ১২ ঘণ্টার AM/PM ফরম্যাট চেক করার জন্য স্ট্যান্ডার্ড রেজেক্স
//     return /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i.test(v);
//   },
//   message: props => `${props.value} সঠিক ১২ ঘণ্টার সময় ফরম্যাট (ex: 7:20 AM, 02:40 PM) নয়!`
// };

// // ১২ ঘণ্টার সময়কে তুলনা বা সর্ট করার জন্য সাময়িকভাবে ২৪ ঘণ্টায় রূপান্তর করার হেল্পার ফাংশন
// const convertTo24Hour = (timeStr) => {
//   if (!timeStr) return "00:00";
  
//   let match = timeStr.toUpperCase().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/);
//   if (!match) return "00:00";

//   let [_, hours, minutes, modifier] = match;
//   let hoursInt = parseInt(hours, 10);

//   if (modifier === "PM" && hoursInt < 12) hoursInt += 12;
//   if (modifier === "AM" && hoursInt === 12) hoursInt = 0;

//   return `${hoursInt.toString().padStart(2, "0")}:${minutes}`;
// };

// // প্রতিটি স্টপেজের জন্য সাব-স্কিমা
// const StopSchema = new mongoose.Schema({
//   stopName: { type: String, required: true },
//   time: { type: String, validate: timeValidator, default: null }, 
//   sequence: { type: Number, required: true }
// }, { _id: false });

// // ট্রিপ সাব-স্কিমা
// const TripSchema = new mongoose.Schema({
//   // ✅ tripTitle-এ আপনার ছবির লাল অংশের সম্পূর্ণ রুটটি বসবে (যেমন: "সাউদার্ন ইস্ট ক্যাম্পাস-২ নং গেইট-বহদ্দার হাট...")
//   tripTitle: { type: String, required: true },
//   days: [{
//     type: String,
//     enum: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
//     required: true
//   }],
//   stops: [StopSchema]
// }, { 
//   timestamps: true,
//   strictPopulate: false,
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true }
// });

// // ----------------- VIRTUALS -----------------
// // প্রথম নির্ধারিত স্টপ এবং শেষ নির্ধারিত স্টপ সুন্দরভাবে রিটার্ন করবে
// TripSchema.virtual("from").get(function () {
//   if (this.stops && this.stops.length > 0) {
//     // সিকোয়েন্স ফিল্টার করার পর প্রথম যে স্টপে টাইম আছে
//     const timedStops = this.stops.filter(s => s.time);
//     if (timedStops.length > 0) {
//       return { stop: timedStops[0].stopName, time: timedStops[0].time };
//     }
//   }
//   return null;
// });

// TripSchema.virtual("to").get(function () {
//   if (this.stops && this.stops.length > 0) {
//     const timedStops = this.stops.filter(s => s.time);
//     if (timedStops.length > 0) {
//       return { stop: timedStops[timedStops.length - 1].stopName, time: timedStops[timedStops.length - 1].time };
//     }
//   }
//   return null;
// });

// // ----------------- PRE-HOOKS -----------------

// TripSchema.pre("validate", async function () {
//   if (this.stops && this.stops.length > 0) {
//     // ১. ডাটাবেজে সেভ হওয়ার আগে সিকোয়েন্স অনুযায়ী স্টপগুলো সর্ট করে নেওয়া
//     this.stops.sort((a, b) => a.sequence - b.sequence);

//     // ২. লজিক্যাল ভ্যালিডেশন: শুরুর সময় এবং গন্তব্যের সময় যেন একদম সমান না হয়
//     const timedStops = this.stops.filter(s => s.time);
    
//     if (timedStops.length >= 2) {
//       const firstStop = timedStops[0];
//       const lastStop = timedStops[timedStops.length - 1];

//       const startTime24 = convertTo24Hour(firstStop.time);
//       const endTime24 = convertTo24Hour(lastStop.time);

//       // 🌙 Overnight trip handling: trip মধ্যরাত পার করে পরদিন শেষ হতে পারে
//       // (যেমন শুরু 09:40 PM, শেষ 01:59 AM পরদিন) — এটা সম্পূর্ণ valid schedule।
//       // তাই startTime24 > endTime24 হলে সেটাকে overnight trip ধরে নিয়ে
//       // pass করানো হচ্ছে, error ছোঁড়া হচ্ছে না।
//       //
//       // শুধু তখনই error দেওয়া হবে যখন দুই সময় হুবহু সমান — কারণ একটা trip-এর
//       // শুরু আর শেষ সময় (duration শূন্য) কখনোই এক হতে পারে না।
//       if (startTime24 === endTime24) {
//         throw new Error(`Trip Validation Error: Trip start time (${firstStop.time}) and arrival time (${lastStop.time}) cannot be the same.`);
//       }
//     }
//   }
// });

// // মেইন বাস স্কিমা
// const BusSchema = new mongoose.Schema({
//   busNo: { type: String, required: true, unique: true },
//   busName: { type: String, required: true },
//   trips: [TripSchema],
  
//   // 🎯 'driver' কেটে 'driverId' করে দেওয়া হলো
//   driverId: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: "Driver", 
//     default: null 
//   }
// }, { timestamps: true });

// // বাসের সমস্ত ট্রিপগুলোকে দিনের শুরুর সময় (Chronological Order) অনুযায়ী সাজানো
// BusSchema.pre("save", async function () {
//   if (this.trips && this.trips.length > 0) {
//     this.trips.sort((a, b) => {
//       const aFirstStop = a.stops.find(s => s.time);
//       const bFirstStop = b.stops.find(s => s.time);
      
//       const aTime = aFirstStop ? aFirstStop.time : "00:00 AM";
//       const bTime = bFirstStop ? bFirstStop.time : "00:00 AM";
      
//       return convertTo24Hour(aTime).localeCompare(convertTo24Hour(bTime));
//     });
//   }
// });

// module.exports = mongoose.model("Bus", BusSchema);

const mongoose = require("mongoose");

// ১২ ঘণ্টার ফরম্যাট ভ্যালিডেটর (null বা ফাঁকা ভ্যালুকে স্কিপ করবে)
const timeValidator = {
  validator: v => {
    if (v === null || v === undefined || v === "") return true;
    // কোলন (:) দিয়ে ১২ ঘণ্টার AM/PM ফরম্যাট চেক করার জন্য স্ট্যান্ডার্ড রেজেক্স
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
  sequence: { type: Number, required: true },

  // 🗺️ Live-tracking additions: coordinates for this stop, used to draw the
  // route polyline/markers and to compute the "next stop" on the student
  // map (see socketHandler.js / locationController.js). Optional so
  // existing schedule-only stops don't need a migration to stay valid —
  // but a stop without lat/lng simply won't render on the live map.
  lat: { type: Number, default: null },
  lng: { type: Number, default: null }
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
  stops: [StopSchema],

  // 🗺️ Encoded polyline (Google Directions "overview_polyline.points" format)
  // for this specific trip's fixed road route. Decoded client-side with
  // @mapbox/polyline to draw the dimmed "full route" line on the student
  // map, with the live segment from the bus's current position to the
  // next stop drawn highlighted on top of it.
  routePolyline: { type: String, default: null }
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

// 🗺️ Live-tracking helper: given the bus's current coordinates, return the
// next stop this trip hasn't reached yet (by sequence order, skipping any
// stop within ~80m which is treated as "arrived"). Returns null if every
// stop with coordinates has been passed, or if no stops have lat/lng set.
// Used by locationController.js when building the student-facing snapshot.
TripSchema.methods.getNextStop = function (currentLat, currentLng) {
  if (currentLat == null || currentLng == null) return null;

  const geoStops = [...this.stops]
    .filter(s => s.lat != null && s.lng != null)
    .sort((a, b) => a.sequence - b.sequence);

  const toRad = deg => (deg * Math.PI) / 180;
  const haversineMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  };

  // Find the stop closest to the bus's current position first, THEN decide
  // "next" relative to it. A naive "first stop more than 80m away, in
  // sequence order" breaks as soon as the bus has moved past an early stop:
  // that stop is still far away (now behind the bus, not ahead) and would
  // get wrongly returned as "next". Anchoring on the nearest stop avoids
  // that.
  let closestIndex = 0;
  let closestDistance = Infinity;
  geoStops.forEach((stop, index) => {
    const distance = haversineMeters(currentLat, currentLng, stop.lat, stop.lng);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  // Close enough to the nearest stop = treat it as reached, next stop is
  // whatever comes after it in sequence (null if it was the last one).
  if (closestDistance <= 80) {
    return geoStops[closestIndex + 1] || null;
  }

  // Otherwise the nearest stop is still ahead of the bus - that IS the next stop.
  return geoStops[closestIndex];
};

// ----------------- PRE-HOOKS -----------------

TripSchema.pre("validate", async function () {
  if (this.stops && this.stops.length > 0) {
    // ১. ডাটাবেজে সেভ হওয়ার আগে সিকোয়েন্স অনুযায়ী স্টপগুলো সর্ট করে নেওয়া
    this.stops.sort((a, b) => a.sequence - b.sequence);

    // ২. লজিক্যাল ভ্যালিডেশন: শুরুর সময় এবং গন্তব্যের সময় যেন একদম সমান না হয়
    const timedStops = this.stops.filter(s => s.time);
    
    if (timedStops.length >= 2) {
      const firstStop = timedStops[0];
      const lastStop = timedStops[timedStops.length - 1];

      const startTime24 = convertTo24Hour(firstStop.time);
      const endTime24 = convertTo24Hour(lastStop.time);

      // 🌙 Overnight trip handling: trip মধ্যরাত পার করে পরদিন শেষ হতে পারে
      // (যেমন শুরু 09:40 PM, শেষ 01:59 AM পরদিন) — এটা সম্পূর্ণ valid schedule।
      // তাই startTime24 > endTime24 হলে সেটাকে overnight trip ধরে নিয়ে
      // pass করানো হচ্ছে, error ছোঁড়া হচ্ছে না।
      //
      // শুধু তখনই error দেওয়া হবে যখন দুই সময় হুবহু সমান — কারণ একটা trip-এর
      // শুরু আর শেষ সময় (duration শূন্য) কখনোই এক হতে পারে না।
      if (startTime24 === endTime24) {
        throw new Error(`Trip Validation Error: Trip start time (${firstStop.time}) and arrival time (${lastStop.time}) cannot be the same.`);
      }
    }
  }
});

// মেইন বাস স্কিমা
const BusSchema = new mongoose.Schema({
  busNo: { type: String, required: true, unique: true },
  busName: { type: String, required: true },
  trips: [TripSchema],
  
  // 🎯 'driver' কেটে 'driverId' করে দেওয়া হলো
  driverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Driver", 
    default: null 
  },

  // 🗺️ Live-tracking additions
  capacity: { type: Number, default: 40 },
  status: {
    type: String,
    enum: ["active", "maintenance", "inactive"],
    default: "active"
  }
}, { timestamps: true });

// বাসের সমস্ত ট্রিপগুলোকে দিনের শুরুর সময় (Chronological Order) অনুযায়ী সাজানো
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

// 🗺️ Live-tracking helper: which of this bus's scheduled trips is "now"?
// Matches today's day-of-week against trip.days, then picks the trip whose
// timed-stop window contains the current time (handles the overnight case
// by treating start > end as wrapping past midnight). Used when a driver
// starts sharing, so the socket layer knows which trip's stops/polyline to
// attach to the live session without the driver having to pick manually.
BusSchema.methods.getActiveTripNow = function (now = new Date()) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = dayNames[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const toMinutes = (timeStr) => {
    const [hm] = [convertTo24Hour(timeStr)];
    const [h, m] = hm.split(":").map(Number);
    return h * 60 + m;
  };

  const candidates = this.trips.filter(t => t.days.includes(today));

  for (const trip of candidates) {
    const timedStops = trip.stops.filter(s => s.time);
    if (timedStops.length < 2) continue;

    const start = toMinutes(timedStops[0].time);
    const end = toMinutes(timedStops[timedStops.length - 1].time);

    const isOvernight = start > end;
    const inWindow = isOvernight
      ? nowMinutes >= start || nowMinutes <= end
      : nowMinutes >= start && nowMinutes <= end;

    if (inWindow) return trip;
  }

  return null;
};

module.exports = mongoose.model("Bus", BusSchema);