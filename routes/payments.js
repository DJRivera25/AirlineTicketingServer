const express = require("express");
const router = express.Router();
const { verify, verifyAdmin, isLoggedIn } = require("../auth.js");
const paymentController = require("../controllers/payments.js");

router.post("/create-payment-intent", verify, paymentController.createPaymentIntent);
router.post("/record", verify, paymentController.createPayment);
router.get("/all", verify, verifyAdmin, paymentController.getAllPayment);
router.get("/", verify, paymentController.getPayment);
router.post("/sandbox/gcash", verify, paymentController.createGcashSandboxCharge);
router.get("/verify-gcash", verify, paymentController.verifyGcashPayment);

module.exports = router;
