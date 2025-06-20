const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const autoFailBookings = require("./jobs/autoFailBookings");
const session = require("express-session");
const cors = require("cors");
require("dotenv").config();

// ===== INITIALIZE EXPRESS APP ===== //
const app = express();

// ===== MIDDLEWARES ===== //
app.use(express.json());

const corsOptions = {
  origin: ["http://localhost:3000"],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ===== GOOGLE OAUTH ===== //
app.use(
  session({
    secret: process.env.CLIENT_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
require("./passport.js");
app.use(passport.initialize());
app.use(passport.session());

// ===== IMPORTING ROUTES ===== //
const userRoute = require("./routes/users.js");
const flightRoute = require("./routes/flights.js");
const bookingRoute = require("./routes/bookings.js");
const passengerRoute = require("./routes/passengers.js");
const seatRoute = require("./routes/seats.js");
const paymentRoute = require("./routes/payments.js");

// ===== ROUTE MIDDLEWARES ===== //
app.use("/users", userRoute);
app.use("/flights", flightRoute);
app.use("/bookings", bookingRoute);
app.use("/passengers", passengerRoute);
app.use("/seats", seatRoute);
app.use("/payments", paymentRoute);

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_STRING);

    console.log("Connected to MongoDB Atlas successfully!");
    autoFailBookings();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1); // Exit the process if DB connection fails
  }
}

// Only start server if this file is run directly (not imported)
if (require.main === module) {
  startServer();
}

// ===== EXPORTS ===== //
module.exports = { app, mongoose };
