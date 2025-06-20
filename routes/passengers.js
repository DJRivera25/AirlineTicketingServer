const express = require("express");
const router = express.Router();
const passengerController = require("../controllers/passengers.js");
const { verify, verifyAdmin, isLoggedIn } = require("../auth.js");

router.post("/", verify, passengerController.createPassenger);
router.get("/all", verify, verifyAdmin, passengerController.getAllPassengers);
router.get("/booking/:bookingId", verify, verifyAdmin, passengerController.getPassengersByBooking);
router.get("/:id", verify, verifyAdmin, passengerController.getPassengerById);
router.put("/:id", passengerController.updatePassenger);
router.delete("/:id", verify, verifyAdmin, passengerController.deletePassenger);

module.exports = router;
