const moment = require("moment");
const mongoose = require('mongoose');
const Bus = require('../models/Bus');

// Create Bus with Trips

exports.createBus = async (req, res) => {
  try {
    const { busNo, busName, trips } = req.body;

    const existingBus = await Bus.findOne({ busNo, isDeleted: false });
    if (existingBus) {
      return res.status(400).json({ message: "Bus with this busId already exists" });
    }

    const bus = await Bus.create({ busNo, busName, trips });

    res.status(201).json({ message: "Bus created successfully", bus });
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ message: error.message });
  }
};


exports.getAllBuses = async (req, res) => {
  try {
    const buses = await Bus.find({ isDeleted: false });
    const total = buses.length;

    // ⚠️ No buses found
    if (total === 0) {
      return res.status(200).json({
        success: true,
        message: "No buses found",
        totalBuses: 0,
        data: []
      });
    }

    // ✅ Success
    return res.status(200).json({
      success: true,
      message: "Buses fetched successfully",
      totalBuses: total,
      data: buses
    });

  } catch (error) {
    // ❌ Error
    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};


exports.getBusById = async (req, res) => {
  try {
    const { busId } = req.params;

    // ❌ Invalid ID
    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bus ID"
      });
    }

    const bus = await Bus.findOne({ _id: busId, isDeleted: false });

    // ⚠️ Not found
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found"
      });
    }

    // ✅ Success
    return res.status(200).json({
      success: true,
      message: "Bus fetched successfully",
      data: bus
    });

  } catch (error) {
    // ❌ Error
    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

// Update Bus
exports.updateBus = async (req, res) => {
  try {
    const { busId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).json({ message: "Invalid Bus ID" });
    }

    const bus = await Bus.findOneAndUpdate(
      { _id: busId, isDeleted: false },
      req.body,
      { new: true }
    );

    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    res.json(bus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Soft Delete Bus
exports.deleteBus = async (req, res) => {
  try {
    const { busId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).json({ message: "Invalid Bus ID" });
    }

    const bus = await Bus.findOneAndUpdate(
      { _id: busId, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    res.json({ message: "Bus deleted successfully (soft delete)" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.addTrip = async (req, res) => {
  try {
    const { busId } = req.params;
    const { tripTitle, days, from, to } = req.body;

    if (!tripTitle || !from?.stop || !from?.time || !to?.stop || !to?.time) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    // Find bus by _id
    const bus = await Bus.findOne({ _id: busId, isDeleted: false });
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found" });
    }

    // Create new trip object (Mongoose will auto-generate _id)
    const newTrip = { tripTitle, days, from, to };

    bus.trips.push(newTrip);

    // Sort trips by departure time
    bus.trips.sort((a, b) => a.from.time.localeCompare(b.from.time));

    await bus.save();

    // Return only the newly added trip with its _id
    const addedTrip = bus.trips[bus.trips.length - 1];

    res.status(201).json({
      success: true,
      message: "Trip added successfully",
      data: addedTrip
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.updateTrip = async (req, res) => {
  try {
    const { busId, tripId } = req.params;
    const { tripTitle, days, from, to } = req.body;

    if (!mongoose.Types.ObjectId.isValid(busId) || !mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ success: false, message: "Invalid busId or tripId" });
    }

    const bus = await Bus.findOne({ _id: busId, isDeleted: false });
    if (!bus) return res.status(404).json({ success: false, message: "Bus not found" });

    const trip = bus.trips.id(tripId);
    if (!trip || trip.isDeleted) return res.status(404).json({ success: false, message: "Trip not found" });

    // Update full trip fields if provided
    if (tripTitle) trip.tripTitle = tripTitle;
    if (days) trip.days = days;
    if (from?.stop) trip.from.stop = from.stop;
    if (from?.time) trip.from.time = from.time;
    if (to?.stop) trip.to.stop = to.stop;
    if (to?.time) trip.to.time = to.time;

    // Optional: sort trips by departure time after any update
    bus.trips.sort((a, b) => {
      const t1 = new Date(`1970-01-01T${a.from.time}:00`);
      const t2 = new Date(`1970-01-01T${b.from.time}:00`);
      return t1 - t2;
    });

    await bus.save();

    res.json({
      success: true,
      message: "Trip updated successfully",
      data: trip
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




exports.deleteTrip = async (req, res) => {
  try {
    const { busId, tripId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(busId) || !mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ success: false, message: "Invalid busId or tripId" });
    }

    const bus = await Bus.findOne({ _id: busId, isDeleted: false });
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found" });
    }

    const trip = bus.trips.id(tripId);
    if (!trip || trip.isDeleted) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    // Soft delete
    trip.isDeleted = true;

    await bus.save();

    res.json({
      success: true,
      message: "Trip deleted successfully",
      data: trip
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




exports.softDeleteBus = async (req, res) => {
  try {
    const { busId } = req.params;

    const bus = await Bus.findOneAndUpdate(
      { busId: Number(busId) },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found"
      });
    }

    res.json({
      success: true,
      message: "Bus soft deleted"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.softDeleteTrip = async (req, res) => {
  try {
    const { busId, tripId } = req.params;

    const updated = await Bus.findOneAndUpdate(
      { busId: Number(busId), "trips.tripId": Number(tripId) },
      { $set: { "trips.$.isDeleted": true } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Bus or Trip not found"
      });
    }

    res.json({
      success: true,
      message: "Trip soft deleted"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.restoreBus = async (req, res) => {
  await Bus.findOneAndUpdate(
    { busId: Number(req.params.busId) },
    { $set: { isDeleted: false } }
  );

  res.json({ success: true, message: "Bus restored" });
};

exports.restoreTrip = async (req, res) => {
  await Bus.findOneAndUpdate(
    { busId: Number(req.params.busId), "trips.tripId": Number(req.params.tripId) },
    { $set: { "trips.$.isDeleted": false } }
  );

  res.json({ success: true, message: "Trip restored" });
};

exports.getCurrentTrips = async (req, res) => {
  try {
    const now = moment();
    const nextOneHour = moment().add(1, "hour");
    const currentDay = now.format("dddd");

    const buses = await Bus.find({ isDeleted: false });

    if (!buses || buses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No buses found",
        data: []
      });
    }

    const result = buses
      .map((bus) => {
        const validTrips = bus.trips.filter((trip) => {
          if (trip.isDeleted) return false;
          if (!trip.days.includes(currentDay)) return false;

          const start = moment(
            `${now.format("YYYY-MM-DD")} ${trip.from.time}`,
            "YYYY-MM-DD HH:mm"
          );

          const end = moment(
            `${now.format("YYYY-MM-DD")} ${trip.to.time}`,
            "YYYY-MM-DD HH:mm"
          );

          return (
            now.isBetween(start, end) ||
            start.isBetween(now, nextOneHour)
          );
        });

        return {
          busId: bus._id,
          busNo: bus.busNo,
          busName: bus.busName,
          totalTrips: validTrips.length,
          trips: validTrips,
        };
      })
      .filter((bus) => bus.totalTrips > 0);

    // ⚠️ No active trips
    if (result.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No current or upcoming trips in the next hour",
        currentTime: now.format("HH:mm:ss"),
        nextOneHour: nextOneHour.format("HH:mm:ss"),
        currentDay,
        totalBus: 0,
        data: []
      });
    }

    // ✅ Success
    return res.status(200).json({
      success: true,
      message: "Current trips fetched successfully",
      currentTime: now.format("HH:mm:ss"),
      nextOneHour: nextOneHour.format("HH:mm:ss"),
      currentDay,
      totalBus: result.length,
      data: result
    });

  } catch (error) {
    // ❌ Error
    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

// Get Live Trips (future, running, completed)
exports.getTripsStatus = async (req, res) => {
  try {
    const now = moment();
    const nextOneHour = moment().add(1, "hour");
    const currentDay = now.format("dddd");

    const buses = await Bus.find({ isDeleted: false });

    // ❌ No buses
    if (!buses || buses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No buses found",
        data: []
      });
    }

    const result = buses
      .map((bus) => {
        const running = [];
        const upcoming = [];
        const completed = [];

        bus.trips.forEach((trip) => {
          if (trip.isDeleted) return;
          if (!trip.days.includes(currentDay)) return;

          const start = moment(
            `${now.format("YYYY-MM-DD")} ${trip.from.time}`,
            "YYYY-MM-DD HH:mm"
          );

          const end = moment(
            `${now.format("YYYY-MM-DD")} ${trip.to.time}`,
            "YYYY-MM-DD HH:mm"
          );

          const tripData = {
            tripId: trip._id,
            tripTitle: trip.tripTitle,
            from: trip.from,
            to: trip.to,
            startTime: trip.from.time,
            endTime: trip.to.time,
          };

          if (now.isBetween(start, end)) {
            running.push(tripData);
          } else if (start.isBetween(now, nextOneHour)) {
            upcoming.push(tripData);
          } else if (end.isBefore(now)) {
            completed.push(tripData);
          }
        });

        // sort
        running.sort((a, b) => a.startTime.localeCompare(b.startTime));
        upcoming.sort((a, b) => a.startTime.localeCompare(b.startTime));
        completed.sort((a, b) => a.startTime.localeCompare(b.startTime));

        return {
          busId: bus._id,
          busNo: bus.busNo,
          busName: bus.busName,
          totalRunning: running.length,
          totalUpcoming: upcoming.length,
          totalCompleted: completed.length,
          trips: { running, upcoming, completed },
        };
      })
      .filter(
        (bus) =>
          bus.totalRunning > 0 ||
          bus.totalUpcoming > 0 ||
          bus.totalCompleted > 0
      );

    // ⚠️ No trips found
    if (result.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No trips available for today",
        currentTime: now.format("HH:mm:ss"),
        nextOneHour: nextOneHour.format("HH:mm:ss"),
        currentDay,
        totalBus: 0,
        data: []
      });
    }

    // ✅ Success
    return res.status(200).json({
      success: true,
      message: "Trips status fetched successfully",
      currentTime: now.format("HH:mm:ss"),
      nextOneHour: nextOneHour.format("HH:mm:ss"),
      currentDay,
      totalBus: result.length,
      data: result
    });

  } catch (error) {
    // ❌ Error
    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};
 






