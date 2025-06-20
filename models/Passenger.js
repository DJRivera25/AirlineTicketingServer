const mongoose = require("mongoose");

const passengerSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    fullName: { type: String, required: true },
    birthdate: { type: Date, required: true },
    passportNumber: { type: String, required: true },
    nationality: { type: String, required: true },

    // ✅ Changed from single seatNumber to separate outbound/return seats
    outboundSeatNumber: { type: String, required: true },
    returnSeatNumber: { type: String }, // optional if no return flight

    // Optional gender field
    gender: { type: String, enum: ["Male", "Female", "Other"] },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field for age
passengerSchema.virtual("age").get(function () {
  if (!this.birthdate) return null;
  const today = new Date();
  const birthDate = new Date(this.birthdate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

module.exports = mongoose.model("Passenger", passengerSchema);
