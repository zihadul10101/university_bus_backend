const Student = require('../models/Student');
// const bcrypt = require("bcrypt");
const bcrypt = require('bcryptjs');
const sendEmail = require("../utils/sendEmail");
const Bus = require('../models/Bus');

const moment = require('moment');



exports.registerStudent = async (req, res) => {
  try {
    const { name, email, password, departmentName, mobileNumber } = req.body;
      console.log("Email",email);

    // check existing student
    const existingStudent = await Student.findOne({ email });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // create student with OTP
    const student = await Student.create({
      name,
      email,
      password: hashedPassword,
      departmentName,
      mobileNumber,
      otp: otp,
      otpExpire: Date.now() + 5 * 60 * 1000
    });

    // send OTP email
    await sendEmail(
      email,
      "Student Registration OTP",
      `Your OTP is ${otp}. It will expire in 5 minutes.`
    );

    res.status(201).json({
      success: true,
      message: "Student registered successfully. OTP sent to email.",
      userId: student._id
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCurrentTrips = async (req, res) => {
  try {
    const now = moment();
    const currentTime = now.format("HH:mm:ss");
    const currentDay = now.format("dddd");

    const buses = await Bus.find({ isDeleted: false });

    const schedules = buses.map(bus => {
      const trips = bus.trips.filter(trip => !trip.isDeleted && trip.days.includes(currentDay))
                              .sort((a, b) => a.from.time.localeCompare(b.from.time));
      return {
        busId: bus._id,
        busNo: bus.busNo,
        busName: bus.busName,
        trips
      };
    }).filter(bus => bus.trips.length > 0);

    res.status(200).json({
      success: true,
      currentTime,
      currentDay,
      totalBuses: schedules.length,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLiveTrips = async (req, res) => {
  try {
    const now = moment().format("HH:mm:ss");
    const currentDay = moment().format("dddd");

    const buses = await Bus.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: "$trips" },
      { $match: { "trips.isDeleted": false, "trips.days": currentDay } },
      {
        $addFields: {
          startTime: { $arrayElemAt: ["$trips.route.time", 0] },
          endTime: {
            $arrayElemAt: [
              "$trips.route.time",
              { $subtract: [{ $size: { $ifNull: ["$trips.route", []] } }, 1] }
            ]
          }
        }
      },
      {
        $addFields: {
          status: {
            $switch: {
              branches: [
                { case: { $gt: ["$startTime", now] }, then: "future" },
                { case: { $and: [{ $lte: ["$startTime", now] }, { $gte: ["$endTime", now] }] }, then: "running" }
              ],
              default: "completed"
            }
          }
        }
      },
      {
        $group: {
          _id: "$_id",
          busNo: { $first: "$busNo" },
          busName: { $first: "$busName" },
          trips: {
            $push: {
              tripId: "$trips.tripId",
              tripTitle: "$trips.tripTitle",
              route: "$trips.route",
              status: "$status",
              startTime: "$startTime"
            }
          }
        }
      }
    ]);

    res.json({ success: true, data: buses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNotices = async (req, res) => {
  try {
    const notices = await Notice.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, data: notices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
