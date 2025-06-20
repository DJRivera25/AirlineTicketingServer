const cron = require("node-cron");
const Booking = require("../models/Booking");
const Passenger = require("../models/Passenger");
const Seat = require("../models/Seat");

const autoFailBookings = () => {
  cron.schedule("* * * * *", async () => {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    try {
      // Step 1: Find all pending bookings older than 15 minutes
      const expiredBookings = await Booking.find({
        status: "pending",
        bookedAt: { $lt: fifteenMinutesAgo },
      });

      if (expiredBookings.length === 0) return;

      const expiredBookingIds = expiredBookings.map((b) => b._id);

      // Step 2: Set status to failed
      const result = await Booking.updateMany({ _id: { $in: expiredBookingIds } }, { $set: { status: "failed" } });

      // Step 3: Fetch all related passengers and unbook their seats
      for (const booking of expiredBookings) {
        const passengers = await Passenger.find({ booking: booking._id });

        for (const p of passengers) {
          // Unbook outbound seat
          if (p.outboundSeatNumber) {
            await Seat.findOneAndUpdate(
              { flight: booking.departureFlight, seatNumber: p.outboundSeatNumber },
              { $set: { isBooked: false, passengerId: null } }
            );
          }

          // Unbook return seat if applicable
          if (booking.returnFlight && p.returnSeatNumber) {
            await Seat.findOneAndUpdate(
              { flight: booking.returnFlight, seatNumber: p.returnSeatNumber },
              { $set: { isBooked: false, passengerId: null } }
            );
          }
        }

        // Step 4: Delete all passengers related to this booking
        await Passenger.deleteMany({ booking: booking._id });
      }

      console.log(
        `[CRON] Auto-failed ${result.modifiedCount} expired bookings, unbooked seats, and deleted passengers.`
      );
    } catch (err) {
      console.error("[CRON] Error failing bookings:", err.message);
    }
  });
};

module.exports = autoFailBookings;
