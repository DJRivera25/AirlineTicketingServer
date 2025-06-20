const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  method: {
    type: String,
    enum: ["card", "gcash", "paypal", "bank_transfer"],
    required: true,
  },
  status: {
    type: String,
    enum: ["processing", "succeeded", "failed"],
    default: "processing",
  },
  amount: {
    type: Number,
    required: true,
    min: [0, "Amount must be a positive number"],
  },
  currency: {
    type: String,
    default: "php",
  },
  stripePaymentIntentId: String, // Stripe's PaymentIntent ID
  stripeCustomerId: String, // Optional: if you create Stripe customers
  transactionId: String, // Optional legacy/other method
  receiptUrl: String, // Stripe hosted receipt link
  paidAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Payment", paymentSchema);
