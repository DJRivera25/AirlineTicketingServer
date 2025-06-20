const Seat = require("../models/Seat");

// Get all seats by flight ID
module.exports.getSeatsByFlight = async (req, res) => {
  try {
    const seats = await Seat.find({ flight: req.params.flightId }).populate("passengerId", "fullName");
    res.status(200).json(seats);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch seats." });
  }
};

// Toggle booking status of a seat
module.exports.toggleSeatBooking = async (req, res) => {
  try {
    const seat = await Seat.findById(req.params.seatId);
    if (!seat) return res.status(404).json({ message: "Seat not found." });

    seat.isBooked = !seat.isBooked;
    seat.passengerId = seat.isBooked ? null : null; // Simulated user/admin
    await seat.save();

    res.status(200).json(seat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
