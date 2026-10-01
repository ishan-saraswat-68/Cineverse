import Show from "../models/show.js";
import Booking from "../models/booking.js";
import User from "../models/User.js";
import Stripe from "stripe";
import { acquireSeatLocks, releaseSeatLocks, getShowLocks } from "../config/redis.js";
import { inngest } from "../inngest/index.js";

// Helper function to check availability in MongoDB
const checkAvailability = async (showID, selectedSeats) => {
  try {
    const showData = await Show.findById(showID);
    if (!showData) return false;

    const occupiedSeats = showData.occupiedSeats || {};
    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);
    return !isAnySeatTaken;
  } catch (error) {
    console.error("checkAvailability error:", error);
    return false;
  }
};

// Helper function to calculate total
const calculateTotalAmount = (showData, selectedSeats) => {
  const sections = showData.theatre?.seatingSections || [];
  const sectionPrices = showData.sectionPrices || {};
  const defaultPrice = showData.showPrice || 0;

  return selectedSeats.reduce((total, seatId) => {
    const rowLetter = seatId.replace(/[0-9]/g, "");
    const section = sections.find((sec) => sec.rowLetters?.includes(rowLetter));
    const price = section && sectionPrices[section.name] ? sectionPrices[section.name] : defaultPrice;
    return total + price;
  }, 0);
};

// API: Create Booking & Lock Seats
export const createBooking = async (req, res) => {
  try {
    const { showId, selectedSeats } = req.body;
    const { userId } = req.auth();
    const rawOrigin = req.headers.origin || req.headers.referer || process.env.CLIENT_URL || "http://localhost:5173";
    const origin = rawOrigin.replace(/\/$/, "");

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please login to continue." });
    }

    if (!showId || !selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
      return res.status(400).json({ success: false, message: "Show ID and selected seats are required" });
    }

    // 1. Check MongoDB (Permanent Bookings)
    const isAvailableInMongo = await checkAvailability(showId, selectedSeats);
    if (!isAvailableInMongo) {
      return res.status(409).json({
        success: false,
        message: "One or more seats have already been booked. Please choose different seats.",
      });
    }

    // 2. Acquire Redis Distributed Lock from environment variable
    const lockTtlSeconds = parseInt(process.env.SEAT_LOCK_TTL_SECONDS, 10) || 300;
    const LOCK_TTL_MS = lockTtlSeconds * 1000;
    const lockAcquired = await acquireSeatLocks(showId, selectedSeats, userId, LOCK_TTL_MS);
    if (!lockAcquired) {
      return res.status(409).json({
        success: false,
        message: "One or more seats are currently held by another user. Please choose different seats.",
      });
    }

    // 3. Broadcast to all clients in this show room (turns Amber in UI)
    const io = req.app.get("io");
    if (io) {
      io.to(`show:${showId}`).emit("seats-locked", {
        showId,
        seats: selectedSeats,
        userId,
        ttlMs: LOCK_TTL_MS,
      });
    }

    // 4. Fetch show details to calculate price
    const showData = await Show.findById(showId).populate("theatre").populate("movie");
    if (!showData) {
      await releaseSeatLocks(showId, selectedSeats, userId);
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    const totalAmount = calculateTotalAmount(showData, selectedSeats);

    // 5. Create draft Booking document
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: totalAmount,
      bookedSeats: selectedSeats,
      isPaid: false,
      status: "pending",
    });

    // 6. Create Stripe Checkout Session (Stripe API requires >= 30 min on creation)
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
    const line_items = [{
      price_data: {
        currency: 'inr',
        product_data: {
          name: showData.movie.title,
          description: `Selected seats: ${selectedSeats.join(", ")}`,
        },
        unit_amount: Math.floor(booking.amount * 100),
      },
      quantity: 1,
    }];

    let customerEmail = "";
    try {
      const dbUser = await User.findById(userId);
      if (dbUser?.email) customerEmail = dbUser.email;
    } catch (e) {
      console.warn("User lookup in createBooking:", e.message);
    }

    const sessionParams = {
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      metadata: {
        bookingId: booking._id.toString(),
        userId,
        showId,
        customerEmail,
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Stripe API requires minimum 30 minutes
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripeInstance.checkout.sessions.create(sessionParams);

    booking.paymentLink = session.url;
    await booking.save();

    // 7. Schedule Inngest Watchdog (force-expires Stripe and releases Redis locks at 5 min)
    await inngest.send({
      name: "booking/lock.created",
      data: {
        bookingId: booking._id.toString(),
        showId,
        seats: selectedSeats,
        userId,
        ttlSeconds: lockTtlSeconds,
        sessionId: session.id,
      },
    });

    res.json({
      success: true,
      url: session.url,
      bookingId: booking._id,
    });
  } catch (error) {
    console.error("createBooking error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API: Manually release seats if user clicks Cancel
export const releaseSeatsManually = async (req, res) => {
  try {
    const { showId, seats } = req.body;
    const { userId } = req.auth();

    if (!userId || !showId || !seats) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    await releaseSeatLocks(showId, seats, userId);

    const io = req.app.get("io");
    if (io) {
      io.to(`show:${showId}`).emit("seats-released", {
        showId,
        seats,
      });
    }

    res.json({ success: true, message: "Seats released successfully" });
  } catch (error) {
    console.error("releaseSeats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API: Get occupied & locked seats for initial page load
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showID } = req.params;
    const showData = await Show.findById(showID);
    if (!showData) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    const occupiedSeats = Object.keys(showData.occupiedSeats || {});
    const activeLocks = await getShowLocks(showID);

    res.json({
      success: true,
      occupiedSeats,
      activeLocks,
    });
  } catch (error) {
    console.error("getOccupiedSeats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
