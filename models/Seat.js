const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
  flight: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Flight",
    required: true,
  },
  seatNumber: {
    type: String, // e.g., "1A", "2C"
    required: true,
  },
  seatClass: {
    type: String,
    enum: ["Economy", "Business", "First"],
    default: "Economy",
  },
  isBooked: {
    type: Boolean,
    default: false,
  },
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Passenger",
    default: null,
  },
});

module.exports = mongoose.model("Seat", seatSchema);
