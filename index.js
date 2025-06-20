const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const autoFailBookings = require("./jobs/autoFailBookings");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
require("dotenv").config();

// ===== INITIALIZE EXPRESS APP ===== //
const app = express();

// ===== MIDDLEWARES ===== //
app.use(express.json());

// CORS: Allow local or Render frontend
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true,
};
app.use(cors(corsOptions));

// ===== SESSIONS ===== //
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_STRING,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// ===== GOOGLE OAUTH ===== //
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

// ===== START SERVER ===== //
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
    process.exit(1);
  }
}

// ===== HANDLE ERRORS GLOBALLY ===== //
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

// ===== LAUNCH ===== //
if (require.main === module) {
  startServer();
}

module.exports = { app, mongoose };
