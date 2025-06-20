const Passenger = require("../models/Passenger");

/* ========== CREATE A PASSENGER ========== */
module.exports.createPassenger = async (req, res) => {
  try {
    const { booking, fullName, birthdate, passportNumber, nationality, outboundSeatNumber, returnSeatNumber, gender } =
      req.body;

    if (!booking || !fullName || !birthdate || !passportNumber || !nationality || !outboundSeatNumber) {
      return res.status(400).json({ error: "Missing required passenger fields." });
    }

    const newPassenger = new Passenger({
      booking,
      fullName,
      birthdate,
      passportNumber,
      nationality,
      outboundSeatNumber,
      returnSeatNumber,
      gender,
    });

    await newPassenger.save();
    res.status(201).json(newPassenger); // will include age via virtual
  } catch (err) {
    console.error("Error creating passenger:", err);
    res.status(500).json({ error: "Failed to create passenger." });
  }
};

/* ========== GET ALL PASSENGERS ========== */
module.exports.getAllPassengers = async (req, res) => {
  try {
    const passengers = await Passenger.find().populate("booking");
    res.status(200).json(passengers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch passengers." });
  }
};

/* ========== GET PASSENGERS BY BOOKING ID ========== */
module.exports.getPassengersByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const passengers = await Passenger.find({ booking: bookingId });
    res.status(200).json(passengers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch passengers for this booking." });
  }
};

/* ========== GET SINGLE PASSENGER BY ID ========== */
module.exports.getPassengerById = async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.params.id).populate("booking");

    if (!passenger) {
      return res.status(404).json({ error: "Passenger not found." });
    }

    res.status(200).json(passenger);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch passenger." });
  }
};

/* ========== UPDATE PASSENGER ========== */
module.exports.updatePassenger = async (req, res) => {
  try {
    const updated = await Passenger.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "Passenger not found." });
    }

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update passenger." });
  }
};

/* ========== DELETE PASSENGER ========== */
module.exports.deletePassenger = async (req, res) => {
  try {
    const deleted = await Passenger.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Passenger not found." });
    }

    res.status(200).json({ message: "Passenger deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete passenger." });
  }
};
