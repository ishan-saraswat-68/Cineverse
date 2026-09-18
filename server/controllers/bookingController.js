import Show from "../models/show.js";
import Booking from "../models/booking.js";
import Stripe from "stripe";

// Helper function to check availability of selected seats
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

// Helper function to calculate accurate dynamic amount from theatre sections
const calculateTotalAmount = (showData, selectedSeats) => {
  const sections = showData.theatre?.seatingSections || [];
  const sectionPrices = showData.sectionPrices || {};
  const defaultPrice = showData.showPrice || 0;

  return selectedSeats.reduce((total, seatId) => {
    const rowLetter = seatId.replace(/[0-9]/g, "");
    const section = sections.find((sec) => sec.rowLetters?.includes(rowLetter));
    const price = (section && sectionPrices[section.name]) ? sectionPrices[section.name] : defaultPrice;
    return total + price;
  }, 0);
};

// API to create booking
export const createBooking = async (req, res) => {
  try {
    const { showId, selectedSeats } = req.body;
    const { userId } = req.auth();
    const {origin} = req.headers;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please login to continue." });
    }

    if (!showId || !selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
      return res.status(400).json({ success: false, message: "Show ID and selected seats are required" });
    }

    // 1. Check seat availability
    const isAvailable = await checkAvailability(showId, selectedSeats);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: "One or more selected seats are already booked. Please choose different seats.",
      });
    }

    // 2. Fetch show with populated theatre to calculate exact dynamic section prices
    const showData = await Show.findById(showId).populate("theatre").populate("movie");
    if (!showData) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    const totalAmount = calculateTotalAmount(showData, selectedSeats);

    // 3. Create booking record
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: totalAmount,
      bookedSeats: selectedSeats,
      isPaid: false,
    });

    // 4. Reserve seats in the show document
    if (!showData.occupiedSeats) {
      showData.occupiedSeats = {};
    }
    selectedSeats.forEach((seat) => {
      showData.occupiedSeats[seat] = userId;
    });

    showData.markModified("occupiedSeats");
    await showData.save();

    // stripe payment gateway integration
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
    // creating line items for stripe 
    const line_items = [{
      price_data: {
        currency: 'inr',
        product_data: {
          name: showData.movie.title,
          description: `Selected seats: ${selectedSeats.join(", ")}`,
        },
        unit_amount: Math.floor(booking.amount * 100),
      },
      quantity: 1
    }]

    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      metadata: {
        bookingId: booking._id.toString()
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60 //expires in 30 minutes
    });

    booking.paymentLink = session.url;
    await booking.save();


    res.json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.error("createBooking error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to get occupied seats for a show
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showID } = req.params;
    const showData = await Show.findById(showID);
    if (!showData) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }
    const occupiedSeats = Object.keys(showData.occupiedSeats || {});
    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.error("getOccupiedSeats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
