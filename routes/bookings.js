const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookings.js");
const { verify, verifyAdmin, isLoggedIn } = require("../auth.js");

router.post("/", verify, bookingController.createBooking);
router.get("/", verify, verifyAdmin, bookingController.getAllBookings);
router.patch("/:bookingId/status", verify, bookingController.updateBookingStatus);
router.patch("/:bookingId/pay", verify, bookingController.updateBookingPaid);
router.get("/:id", verify, bookingController.getBookingById);
router.post("/my-bookings", verify, bookingController.getBookingsByEmail);

module.exports = router;
