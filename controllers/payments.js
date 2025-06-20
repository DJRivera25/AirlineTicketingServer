const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const User = require("../models/User");

module.exports.createPaymentIntent = async (req, res) => {
  const { amount } = req.body; // amount in cents

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "php",
      automatic_payment_methods: { enabled: true },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).send({ error: error.message });
  }
};

module.exports.createPayment = async (req, res) => {
  try {
    const {
      booking,
      method,
      amount,
      status,
      stripePaymentIntentId,
      stripeCustomerId,
      transactionId,
      receiptUrl,
      paidAt,
    } = req.body;

    const user = req.user.id;

    // Create payment document
    const payment = new Payment({
      booking,
      user,
      method,
      amount,
      status,
      stripePaymentIntentId,
      stripeCustomerId,
      transactionId,
      receiptUrl,
      paidAt: paidAt ? new Date(paidAt) : undefined,
    });

    await payment.save();

    res.status(201).json(payment);
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports.getAllPayment = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("user", "fullName email")
      .populate("booking")
      .sort({ createdAt: -1 });

    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments." });
  }
};

module.exports.getPayment = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await Payment.find({ user: userId }).populate("booking").sort({ createdAt: -1 });

    res.status(200).json({ payments });
  } catch (error) {
    console.error("Error fetching user payments:", error);
    res.status(500).json({ error: "Failed to fetch your payments." });
  }
};
