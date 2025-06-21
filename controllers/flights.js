const Flight = require("../models/Flight");
const Seat = require("../models/Seat");

/* =============== PUBLIC CONTROLLERS =============== */

// GET all flights with pagination + search
module.exports.getAllFlights = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;

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

    const flightsWithSeats = await Promise.all(
      flights.map(async (flight) => {
        const availableSeats = await Seat.countDocuments({
          flight: flight._id,
          isBooked: false,
        });
        return { ...flight.toObject(), availableSeats };
      })
    );

    res.status(200).json({
      flights: flightsWithSeats,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      totalItems: total,
    });
  } catch (error) {
    console.error("getAllFlights ERROR:", error);
    res.status(500).json({ message: "Failed to fetch flights", error: error.message });
  }
};

// GET single flight + dynamic seat count
module.exports.getSingleFlight = async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({ message: "Flight not found" });

    const availableSeats = await Seat.countDocuments({
      flight: flight._id,
      isBooked: false,
    });

    res.status(200).json({ ...flight.toObject(), availableSeats });
  } catch (error) {
    res.status(500).json({ message: "Error fetching flight", error });
  }
};

// SEARCH flights with outbound and return logic
module.exports.searchFlights = async (req, res) => {
  try {
    const { from, to, departure, return: returnDate, passengers = 1 } = req.body;

    if (!from || !to || !departure) {
      return res.status(400).json({ message: "From, to, and departure date are required." });
    }

    const normalizedFrom = from.trim();
    const normalizedTo = to.trim();
    const numPassengers = Number(passengers);

    const depStart = new Date(departure);
    const depEnd = new Date(depStart);
    depEnd.setDate(depEnd.getDate() + 1);

    // 🔍 Search outbound flights
    let outboundFlights = await Flight.find({
      from: { $regex: `^${normalizedFrom}$`, $options: "i" },
      to: { $regex: `^${normalizedTo}$`, $options: "i" },
      departureTime: { $gte: depStart, $lt: depEnd },
    }).sort({ departureTime: 1 });

    // 🎫 Filter flights with enough available seats
    outboundFlights = await Promise.all(
      outboundFlights.map(async (flight) => {
        const availableSeats = await Seat.countDocuments({ flight: flight._id, isBooked: false });
        return availableSeats >= numPassengers ? { ...flight.toObject(), availableSeats } : null;
      })
    );
    outboundFlights = outboundFlights.filter(Boolean);

    let returnFlights = [];

    if (returnDate) {
      const retStart = new Date(returnDate);
      const retEnd = new Date(retStart);
      retEnd.setDate(retEnd.getDate() + 1);

      let returnCandidates = await Flight.find({
        from: { $regex: `^${normalizedTo}$`, $options: "i" },
        to: { $regex: `^${normalizedFrom}$`, $options: "i" },
        departureTime: { $gte: retStart, $lt: retEnd },
      }).sort({ departureTime: 1 });

      returnFlights = await Promise.all(
        returnCandidates.map(async (flight) => {
          const availableSeats = await Seat.countDocuments({ flight: flight._id, isBooked: false });
          return availableSeats >= numPassengers ? { ...flight.toObject(), availableSeats } : null;
        })
      );
      returnFlights = returnFlights.filter(Boolean);
    }

    const noOutbound = outboundFlights.length === 0;
    const noReturn = returnDate && returnFlights.length === 0;

    res.status(200).json({
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
    console.error("🔴 Flight search failed:", error);
    res.status(500).json({ message: "Flight search failed", error: error.message });
  }
};

// GET upcoming flights
exports.getUpcomingFlights = async (req, res) => {
  try {
    const today = new Date();
    const flights = await Flight.find({ departureTime: { $gte: today } }).sort({ departureTime: 1 });
    res.status(200).json(flights);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch upcoming flights", error });
  }
};

/* =============== ADMIN CONTROLLERS =============== */

// CREATE flight + generate seats
module.exports.createFlight = async (req, res) => {
  try {
    const { seatCapacity, ...rest } = req.body;

    const flight = new Flight({ ...rest, seatCapacity });
    await flight.save();

    const seatLetters = ["A", "B", "C", "D", "E", "F"];
    const seats = Array.from({ length: seatCapacity }, (_, i) => {
      const row = Math.floor(i / 6) + 1;
      const col = seatLetters[i % 6];
      return {
        flight: flight._id,
        seatNumber: `${row}${col}`,
        seatClass: "Economy",
      };
    });

    await Seat.insertMany(seats);
    res.status(201).json(flight);
  } catch (error) {
    console.error("Flight creation failed:", error);
    res.status(500).json({ message: error.message });
  }
};

// UPDATE flight + seat capacity logic
module.exports.updateFlight = async (req, res) => {
  try {
    const flightId = req.params.id;
    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ message: "Flight not found" });

    const updated = await Flight.findByIdAndUpdate(flightId, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error("Flight update failed:", error);
    res.status(400).json({ message: "Update failed", error });
  }
};

// DELETE flight
module.exports.deleteFlight = async (req, res) => {
  try {
    const deleted = await Flight.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Flight not found" });
    res.status(200).json({ message: "Flight deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error });
  }
};

// FILTER by fields (admin panel)
module.exports.filterFlights = async (req, res) => {
  try {
    const filters = req.body;
    const flights = await Flight.find(filters);
    res.status(200).json(flights);
  } catch (error) {
    res.status(500).json({ message: "Filter failed", error });
  }
};

// GET flights by date range
module.exports.getFlightsByDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;
    const flights = await Flight.find({
      departureTime: { $gte: new Date(start), $lte: new Date(end) },
    }).sort({ departureTime: 1 });
    res.status(200).json(flights);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch range", error });
  }
};

// UPDATE flight status
module.exports.updateFlightStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const flight = await Flight.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    res.status(200).json(flight);
  } catch (error) {
    res.status(400).json({ message: "Status update failed", error });
  }
};

// (Optional future use) Update available seats directly
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

module.exports.importFlights = async (req, res) => {
  try {
    const flights = req.body;

    if (!Array.isArray(flights)) {
      return res.status(400).json({ message: "Payload must be an array of flights" });
    }

    const savedFlights = [];

    for (const flightData of flights) {
      const { seatCapacity, ...rest } = flightData;

      const flight = new Flight({ ...rest, seatCapacity });
      await flight.save(); // 🛫 triggers pre-save hook for duration

      // 🪑 Generate seats for this flight
      const seatLetters = ["A", "B", "C", "D", "E", "F"];
      const seats = Array.from({ length: seatCapacity }, (_, i) => {
        const row = Math.floor(i / 6) + 1;
        const col = seatLetters[i % 6];
        return {
          flight: flight._id,
          seatNumber: `${row}${col}`,
          seatClass: "Economy",
        };
      });

      await Seat.insertMany(seats); // ✅ Insert seat documents

      savedFlights.push(flight);
    }

    res.status(201).json({
      message: `${savedFlights.length} flights imported successfully with seats.`,
      data: savedFlights,
    });
  } catch (err) {
    console.error("Bulk flight import failed:", err);
    res.status(500).json({ message: "Bulk import failed", error: err.message });
  }
};
