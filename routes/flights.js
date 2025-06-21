const express = require("express");
const router = express.Router();
const { verify, verifyAdmin, isLoggedIn } = require("../auth.js");
const flightController = require("../controllers/flights.js");

// 🛫 PUBLIC ROUTES (no login required)
router.get("/", flightController.getAllFlights); // /api/flights
router.post("/search", flightController.searchFlights); // /api/flights/search?from=CEB&to=MNL
router.get("/upcoming", flightController.getUpcomingFlights); // /api/flights/upcoming
router.get("/:id", flightController.getSingleFlight); // /api/flights/123

// 🔐 PROTECTED ADMIN ROUTES (require login + admin role)
router.post("/", verify, verifyAdmin, flightController.createFlight);
router.put("/:id", verify, verifyAdmin, flightController.updateFlight);
router.delete("/:id", verify, verifyAdmin, flightController.deleteFlight);
router.get("/range/filter", verify, verifyAdmin, flightController.getFlightsByDateRange); // /api/flights/range/filter?start=...&end=...
router.patch("/:id/status", verify, verifyAdmin, flightController.updateFlightStatus);
router.patch("/:id/seats", verify, verifyAdmin, flightController.updateSeatAvailability);
router.post("/filter", verify, verifyAdmin, flightController.filterFlights); // or support POST with body filters

router.post("/import", verify, verifyAdmin, flightController.importFlights);
module.exports = router;
