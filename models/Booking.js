const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  passengersCount: Number,
  passengers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Passenger",
      required: true,
    },
  ],
  tripType: {
    type: String,
    enum: ["oneway", "roundtrip"],
    required: true,
  },
  departureFlight: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Flight",
    required: true,
  },
  returnFlight: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Flight",
    default: null,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "cancelled", "failed"],
    default: "pending",
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
  },
  bookedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", bookingSchema);
