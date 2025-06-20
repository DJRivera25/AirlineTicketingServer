const mongoose = require("mongoose");

const flightSchema = new mongoose.Schema(
  {
    flightNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true, // e.g., "TKL123"
    },
    airline: {
      type: String,
      default: "Tiket Lakwatsero Airlines",
    },
    from: {
      type: String,
      required: true,
      uppercase: true, // Airport or city code
    },
    to: {
      type: String,
      required: true,
      uppercase: true,
    },
    departureTime: {
      type: Date,
      required: true,
    },
    arrivalTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    seatCapacity: {
      type: Number,
      required: true,
    },
    availableSeats: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["On Time", "Delayed", "Cancelled", "Completed"],
      default: "On Time",
    },
    gate: {
      type: String,
    },
    terminal: {
      type: String,
    },
  },
  { timestamps: true }
);

flightSchema.pre("save", function (next) {
  if (this.departureTime && this.arrivalTime) {
    const diffMs = new Date(this.arrivalTime) - new Date(this.departureTime);

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    this.duration = `${hours}h ${minutes}m`;
  }

  next();
});

flightSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.arrivalTime && update.departureTime) {
    const dep = new Date(update.departureTime);
    const arr = new Date(update.arrivalTime);
    const diffMs = arr - dep;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    update.duration = `${hours}h ${minutes}m`;
    this.setUpdate(update);
  }

  next();
});

module.exports = mongoose.model("Flight", flightSchema);
