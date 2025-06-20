const Booking = require("../models/Booking");
const Flight = require("../models/Flight");
const Passenger = require("../models/Passenger");
const Seat = require("../models/Seat");

/* =============== PUBLIC ============== */

// Create a booking
module.exports.createBooking = async (req, res) => {
  try {
    const { fullName, email, phone, passengers, tripType, departureFlight, returnFlight } = req.body;

    if (
      !fullName ||
      !email ||
      !phone ||
      !Array.isArray(passengers) ||
      passengers.length === 0 ||
      !tripType ||
      !departureFlight
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const depFlight = await Flight.findById(departureFlight);
    if (!depFlight) return res.status(404).json({ error: "Departure flight not found." });

    let retFlight = null;
    if (tripType === "roundtrip") {
      if (!returnFlight) return res.status(400).json({ error: "Return flight ID required for roundtrip." });
      retFlight = await Flight.findById(returnFlight);
      if (!retFlight) return res.status(404).json({ error: "Return flight not found." });
    }

    const passengersCount = passengers.length;
    const totalPrice = (depFlight.price + (retFlight?.price || 0)) * passengersCount;

    // ✅ Validate seat availability only (no booking yet)
    for (const p of passengers) {
      if (
        !p.fullName ||
        !p.birthdate ||
        !p.passportNumber ||
        !p.nationality ||
        !p.outboundSeatNumber ||
        (tripType === "roundtrip" && !p.returnSeatNumber)
      ) {
        return res.status(400).json({ error: "Each passenger must have complete info." });
      }

      const outboundSeat = await Seat.findOne({ flight: depFlight._id, seatNumber: p.outboundSeatNumber });
      if (!outboundSeat) return res.status(400).json({ error: `Seat ${p.outboundSeatNumber} not found.` });
      if (outboundSeat.isBooked) return res.status(400).json({ error: `Seat ${p.outboundSeatNumber} already booked.` });

      if (tripType === "roundtrip") {
        const returnSeat = await Seat.findOne({ flight: retFlight._id, seatNumber: p.returnSeatNumber });
        if (!returnSeat) return res.status(400).json({ error: `Seat ${p.returnSeatNumber} not found.` });
        if (returnSeat.isBooked) return res.status(400).json({ error: `Seat ${p.returnSeatNumber} already booked.` });
      }
    }

    // ✅ Create booking
    const newBooking = new Booking({
      fullName,
      email,
      phone,
      passengersCount,
      tripType,
      departureFlight: depFlight._id,
      returnFlight: retFlight?._id || null,
      totalPrice,
    });

    await newBooking.save();

    // ✅ Save passengers
    const passengerDocs = passengers.map((p) => ({
      ...p,
      booking: newBooking._id,
    }));

    const savedPassengers = await Passenger.insertMany(passengerDocs);
    newBooking.passengers = savedPassengers.map((p) => p._id);
    await newBooking.save();

    // ✅ Book seats and assign passengerId
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      const passenger = savedPassengers[i];

      // Outbound seat
      const outboundSeat = await Seat.findOne({ flight: depFlight._id, seatNumber: p.outboundSeatNumber });
      if (outboundSeat) {
        outboundSeat.isBooked = true;
        outboundSeat.passengerId = passenger._id;
        await outboundSeat.save();
      }

      // Return seat
      if (tripType === "roundtrip") {
        const returnSeat = await Seat.findOne({ flight: retFlight._id, seatNumber: p.returnSeatNumber });
        if (returnSeat) {
          returnSeat.isBooked = true;
          returnSeat.passengerId = passenger._id;
          await returnSeat.save();
        }
      }
    }

    res.status(201).json(newBooking);
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get all bookings

module.exports.getAllBookings = async (req, res) => {
  try {
    const search = req.query.search?.toLowerCase() || "";

    const bookings = await Booking.find()
      .populate("departureFlight")
      .populate("returnFlight")
      .populate("passengers")
      .populate("payment")
      .sort({ bookedAt: -1 });

    const filtered = bookings.filter((booking) => {
      const fullName = booking.fullName?.toLowerCase() || "";
      const email = booking.email?.toLowerCase() || "";
      const phone = booking.phone?.toLowerCase() || "";
      const bookedDate = new Date(booking.bookedAt).toISOString().split("T")[0];

      const departure = booking.departureFlight;
      const returnFlight = booking.returnFlight;

      const route =
        departure && returnFlight
          ? `${departure.from} → ${departure.to} → ${returnFlight.to}`
          : departure
          ? `${departure.from} → ${departure.to}`
          : "";

      return (
        fullName.includes(search) ||
        email.includes(search) ||
        phone.includes(search) ||
        route.toLowerCase().includes(search) ||
        bookedDate.includes(search)
      );
    });

    res.status(200).json(filtered);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: "Failed to fetch bookings." });
  }
};

// Get a single booking by ID
module.exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("departureFlight")
      .populate("returnFlight")
      .populate("passengers");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    res.status(200).json(booking);
  } catch (err) {
    console.error("Error in getBookingById:", err); // 👈 Add this line
    res.status(500).json({ error: "Failed to fetch booking." });
  }
};

module.exports.getBookingsByEmail = async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const bookings = await Booking.find({ email })
      .populate("departureFlight")
      .populate("returnFlight")
      .populate("passengers")
      .sort({ bookedAt: -1 });

    res.status(200).json(bookings);
  } catch (err) {
    console.error("Error fetching user bookings:", err);
    res.status(500).json({ error: "Failed to fetch user's bookings." });
  }
};

module.exports.updateBookingStatus = async (req, res) => {
  try {
    const id = req.params.bookingId;

    if (!id) {
      return res.status(400).json({ error: "Booking ID" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    // Valid status transitions
    if (booking.status === "pending") {
      booking.status = "cancelled";
    } else if (booking.status === "failed") {
      booking.status = "pending";
    } else {
      return res.status(400).json({ error: `Cannot change status from '${booking.status}' to '${newStatus}'` });
    }

    await booking.save();

    res.status(200).json({ message: `Booking status updated to '${booking.status}'`, booking });
  } catch (err) {
    console.error("Error updating booking status:", err);
    res.status(500).json({ error: "Failed to update booking status." });
  }
};

module.exports.updateBookingPaid = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required." });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    if (booking.status === "paid") {
      return res.status(400).json({ error: "Booking is already marked as paid." });
    }

    booking.status = "paid";
    await booking.save();

    res.status(200).json({
      message: "Booking status updated to 'paid'.",
      booking,
    });
  } catch (err) {
    console.error("Error updating booking to paid:", err);
    res.status(500).json({ error: "Failed to update booking to paid." });
  }
};
