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
    default: "PHP",
    uppercase: true,
  },

  // ✅ Stripe fields
  stripePaymentIntentId: String,
  stripeCustomerId: String,
  receiptUrl: String,

  // ✅ Xendit (GCash, etc.)
  xenditChargeId: String, // e.g., ewc_xxxxx
  xenditCheckoutUrl: String, // desktop or mobile web checkout
  xenditReferenceId: String, // your custom reference id
  xenditChannelCode: String, // PH_GCASH, PH_PAYMAYA, etc.
  xenditRedirectSuccessUrl: String,
  xenditRedirectFailureUrl: String,

  // ✅ General
  transactionId: String, // used as a general unique identifier
  paidAt: Date,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});
