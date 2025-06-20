const Flight = require("../models/Flight");
const Seat = require("../models/Seat");

/* ===============PUBLIC================== */
module.exports.getAllFlights = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;

    // Search query
    const searchQuery = {
      $or: [
        { airline: { $regex: search, $options: "i" } },
        { from: { $regex: search, $options: "i" } },
        { to: { $regex: search, $options: "i" } },
        { flightNumber: { $regex: search, $options: "i" } },
      ],
    };

    const filter = search ? searchQuery : {};

    const total = await Flight.countDocuments(filter);

    const flights = await Flight.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    // Dynamically inject availableSeats
    const flightsWithAvailableSeats = await Promise.all(
      flights.map(async (flight) => {
        const availableSeats = await Seat.countDocuments({
          flight: flight._id,
          isAvailable: true,
        });

        return {
          ...flight.toObject(),
          availableSeats,
        };
      })
    );

    res.status(200).json({
      flights: flightsWithAvailableSeats,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      totalItems: total,
    });
  } catch (error) {
    console.error("getAllFlights ERROR:", error);
    res.status(500).json({ message: "Failed to fetch flights", error: error.message });
  }
};

module.exports.getSingleFlight = async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({ message: "Flight not found" });

    const availableSeats = await Seat.countDocuments({
      flight: flight._id,
      isAvailable: true,
    });

    res.status(200).json({ ...flight.toObject(), availableSeats });
  } catch (error) {
    res.status(500).json({ message: "Error fetching flight", error });
  }
};

module.exports.searchFlights = async (req, res) => {
  try {
    const { from, to, departure, return: returnDate, passengers = 1 } = req.body;

    if (!from || !to || !departure) {
      return res.status(400).json({
        message: "From, to, and departure date are required.",
      });
    }

    const normalizedFrom = from.toUpperCase();
    const normalizedTo = to.toUpperCase();
    const depStart = new Date(departure);
    const depEnd = new Date(depStart);
    depEnd.setDate(depEnd.getDate() + 1);

    // Step 1: Get outbound flights within time range
    let outboundFlights = await Flight.find({
      from: normalizedFrom,
      to: normalizedTo,
      departureTime: { $gte: depStart, $lt: depEnd },
    }).sort({ departureTime: 1 });

    // Step 2: Filter by available seats for outbound
    outboundFlights = await Promise.all(
      outboundFlights.map(async (flight) => {
        const availableSeats = await Seat.countDocuments({
          flight: flight._id,
          isAvailable: true,
        });

        return availableSeats >= passengers ? { ...flight.toObject(), availableSeats } : null;
      })
    );
    outboundFlights = outboundFlights.filter(Boolean); // Remove nulls

    let returnFlights = [];
    if (returnDate) {
      const retStart = new Date(returnDate);
      const retEnd = new Date(retStart);
      retEnd.setDate(retEnd.getDate() + 1);

      let returns = await Flight.find({
        from: normalizedTo,
        to: normalizedFrom,
        departureTime: { $gte: retStart, $lt: retEnd },
      }).sort({ departureTime: 1 });

      returnFlights = await Promise.all(
        returns.map(async (flight) => {
          const availableSeats = await Seat.countDocuments({
            flight: flight._id,
            isAvailable: true,
          });

          return availableSeats >= passengers ? { ...flight.toObject(), availableSeats } : null;
        })
      );
      returnFlights = returnFlights.filter(Boolean);
    }

    const noOutbound = outboundFlights.length === 0;
    const noReturn = returnDate && returnFlights.length === 0;

    return res.status(200).json({
      roundTrip: !!returnDate,
      outbound: outboundFlights,
      return: returnFlights,
      message:
        noOutbound && noReturn
          ? "No matching outbound or return flights found."
          : noOutbound
          ? "No outbound flights found."
          : noReturn
          ? "No return flights found."
          : "Flights found.",
    });
  } catch (error) {
    console.error("Flight search failed:", error);
    return res.status(500).json({
      message: "Flight search failed.",
      error: error.message,
    });
  }
};

exports.getUpcomingFlights = async (req, res) => {
  try {
    const today = new Date();
    const flights = await Flight.find({ date: { $gte: today } });
    res.status(200).json(flights);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch upcoming flights", error });
  }
};

/* ===============ADMIN================== */

module.exports.createFlight = async (req, res) => {
  try {
    const { seatCapacity, ...rest } = req.body;

    // Create Flight
    const flight = new Flight({
      ...rest,
      seatCapacity,
      availableSeats: seatCapacity,
    });
    await flight.save();

    // Generate Seats
    const seats = [];
    const seatLetters = ["A", "B", "C", "D", "E", "F"];
    for (let i = 0; i < seatCapacity; i++) {
      const row = Math.floor(i / 6) + 1;
      const col = seatLetters[i % 6];
      seats.push({
        flight: flight._id,
        seatNumber: `${row}${col}`,
        seatClass: "Economy",
      });
    }

    await Seat.insertMany(seats);

    res.status(201).json(flight);
  } catch (err) {
    console.error("Flight creation failed:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports.updateFlight = async (req, res) => {
  try {
    const flightId = req.params.id;
    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ message: "Flight not found" });

    const oldCapacity = flight.seatCapacity;
    const newCapacity = req.body.seatCapacity;

    const updatedFlight = await Flight.findByIdAndUpdate(flightId, req.body, {
      new: true,
      runValidators: true,
    });

    // Step 1: Recalculate availableSeats
    const allSeats = await Seat.find({ flight: flightId });
    const bookedSeatsCount = allSeats.filter((s) => s.isBooked).length;

    updatedFlight.availableSeats = updatedFlight.seatCapacity - bookedSeatsCount;
    await updatedFlight.save(); // update the value in DB

    res.status(200).json(updatedFlight);
  } catch (error) {
    console.error("Flight update failed:", error);
    res.status(400).json({ message: "Update failed", error });
  }
};

module.exports.deleteFlight = async (req, res) => {
  try {
    const deleted = await Flight.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Flight not found" });
    res.status(200).json({ message: "Flight deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error });
  }
};

module.exports.filterFlights = async (req, res) => {
  try {
    const filters = req.body;
    const flights = await Flight.find(filters);
    res.status(200).json(flights);
  } catch (error) {
    res.status(500).json({ message: "Filter failed", error });
  }
};

module.exports.getFlightsByDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;
    const flights = await Flight.find({
      date: { $gte: new Date(start), $lte: new Date(end) },
    });
    res.status(200).json(flights);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch range", error });
  }
};

module.exports.updateFlightStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const flight = await Flight.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    res.status(200).json(flight);
  } catch (error) {
    res.status(400).json({ message: "Status update failed", error });
  }
};

module.exports.updateSeatAvailability = async (req, res) => {
  try {
    const { seatsAvailable } = req.body;
    const flight = await Flight.findByIdAndUpdate(
      req.params.id,
      { seatsAvailable },
      { new: true, runValidators: true }
    );
    res.status(200).json(flight);
  } catch (error) {
    res.status(400).json({ message: "Seat update failed", error });
  }
};
