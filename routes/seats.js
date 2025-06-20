const express = require("express");
const router = express.Router();
const seatController = require("../controllers/seats.js");

// GET all seats for a specific flight
router.get("/flight/:flightId", seatController.getSeatsByFlight);

// PUT toggle seat booking status
router.put("/:seatId/toggle", seatController.toggleSeatBooking);

module.exports = router;
