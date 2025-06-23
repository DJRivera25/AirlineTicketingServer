const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const User = require("../models/User");
const axios = require("axios");

module.exports.createPaymentIntent = async (req, res) => {
  const { amount } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "php",
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
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
      currency,
      stripePaymentIntentId,
      stripeCustomerId,
      transactionId,
      receiptUrl,
      paidAt,
      // Xendit-specific
      xenditChargeId,
      xenditReferenceId,
      xenditCheckoutUrl,
      xenditChannelCode,
      xenditRedirectSuccessUrl,
      xenditRedirectFailureUrl,
    } = req.body;

    const user = req.user.id; // ✅ Assumes this route is protected with auth middleware

    const payment = new Payment({
      booking,
      user,
      method,
      amount,
      status,
      currency: currency || "PHP",
      stripePaymentIntentId,
      stripeCustomerId,
      transactionId,
      receiptUrl,
      paidAt: paidAt ? new Date(paidAt) : undefined,
      xenditChargeId,
      xenditReferenceId,
      xenditCheckoutUrl,
      xenditChannelCode,
      xenditRedirectSuccessUrl,
      xenditRedirectFailureUrl,
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

module.exports.createGcashSandboxCharge = async (req, res) => {
  const { amount, email, phone } = req.body;

  const formatToE164 = (phone) => {
    if (!phone) return "";
    if (phone.startsWith("+")) return phone;
    if (phone.startsWith("0")) return "+63" + phone.slice(1);
    return phone;
  };

  try {
    const referenceId = `demo-gcash-${Date.now()}`;

    const response = await axios.post(
      "https://api.xendit.co/ewallets/charges",
      {
        reference_id: referenceId,
        currency: "PHP",
        amount,
        checkout_method: "ONE_TIME_PAYMENT",
        channel_code: "PH_GCASH",
        channel_properties: {
          // ✅ Manually pass reference_id in URL for frontend tracking
          success_redirect_url: `https://airline-ticketing-client.vercel.app/gcash/payment-success?ref_id=${referenceId}`,
          failure_redirect_url: "https://airline-ticketing-client.vercel.app/payment-failed",
        },
        customer: {
          email,
          mobile_number: formatToE164(phone),
        },
      },
      {
        auth: {
          username: process.env.XENDIT_SANDBOX_SECRET_KEY,
          password: "",
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("GCash Sandbox Error:", {
      status: error.response?.status,
      message: error.response?.data?.message,
      errors: error.response?.data?.errors,
    });
    res.status(500).json({ error: error.message });
  }
};

module.exports.verifyGcashPayment = async (req, res) => {
  const { ref_id } = req.query;

  if (!ref_id) return res.status(400).json({ valid: false });

  try {
    const payment = await Payment.findOne({
      xenditReferenceId: ref_id,
      method: "gcash",
      status: "succeeded",
    });

    if (!payment) return res.status(404).json({ valid: false });

    res.json({
      valid: true,
      bookingId: payment.booking,
      payment,
    });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ valid: false, error: error.message });
  }
};
