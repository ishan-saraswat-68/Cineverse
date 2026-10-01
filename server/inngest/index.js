import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/booking.js";
import Show from "../models/show.js";
import Movie from "../models/movie.js";
import Theatre from "../models/theatre.js";
import sendEmail from "../config/nodemailer.js";
import { clerkClient } from "@clerk/express";
import { releaseSeatLocks } from "../config/redis.js";
import Stripe from "stripe";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest function to save user data to the database
const syncUserCreation = inngest.createFunction(
    {
        id: 'sync-user-from-clerk',
        triggers: [{ event: 'clerk/user.created' }]
    },
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data.data;
        const userData = {
            _id: id,
            name: first_name + ' ' + last_name,
            email: email_addresses[0].email_address,
            image: image_url
        };

        console.log("User data received:", userData);
        await User.create(userData);
        return { message: 'User created successfully' };
    }
)

// Inngest function to delete user from database when user is deleted from clerk
const syncUserDeletion = inngest.createFunction(
    { id: 'delete-user-with-clerk', triggers: [{ event: 'clerk/user.deleted' }] },
    async ({ event }) => {
        const { id } = event.data.data;
        await User.findByIdAndDelete(id);
        return { message: 'User deleted successfully' };
    }
)

// inngest function to update user from clerk
const syncUserUpdate = inngest.createFunction(
    { id: 'update-user-with-clerk', triggers: [{ event: 'clerk/user.updated' }] },
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data.data;
        const userData = {
            _id: id,
            name: first_name + ' ' + last_name,
            email: email_addresses[0].email_address,
            image: image_url
        };

        console.log("User data received:", userData);
        await User.findByIdAndUpdate(id, userData);
        return { message: 'User created successfully' };
    }
)

// Inngest Function to send email when user books a show
const sendBookingConfirmationEmail = inngest.createFunction(
    {
        id: "send-booking-confirmation-email",
        triggers: [{ event: "app/show.booked" }]
    },
    async ({ event, step }) => {
        const { bookingId } = event.data;

        // Step 1: Fetch booking details with populated show, movie, and theatre
        const booking = await step.run("fetch-booking", async () => {
            const b = await Booking.findById(bookingId).populate({
                path: 'show',
                populate: [
                    { path: "movie", model: "Movie" },
                    { path: "theatre", model: "Theatre" }
                ]
            });
            if (!b) {
                console.error("Booking not found for Inngest event:", bookingId);
            }
            return b;
        });

        if (!booking) {
            return { error: "Booking not found", bookingId };
        }

        // Step 2: Safely resolve recipient user email and name
        const userInfo = await step.run("resolve-recipient", async () => {
            const userId = (typeof booking.user === 'string' ? booking.user : booking.user?._id) || event.data?.userId;

            let email = null;
            let name = 'Movie Lover';

            // 1. Check MongoDB User collection first
            if (userId) {
                try {
                    const dbUser = await User.findById(userId);
                    if (dbUser?.email) {
                        email = dbUser.email;
                        if (dbUser.name) name = dbUser.name;
                    }
                } catch (err) {
                    console.warn("MongoDB user lookup error:", err.message);
                }
            }

            // 2. Fetch directly from Clerk if not found in MongoDB
            if (!email && userId) {
                try {
                    const clerkUser = await clerkClient.users.getUser(userId);
                    email = clerkUser.emailAddresses?.[0]?.emailAddress;
                    if (clerkUser.firstName || clerkUser.lastName) {
                        name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
                    }

                    // Automatically save user to MongoDB for future queries
                    if (clerkUser.id && email) {
                        await User.findByIdAndUpdate(
                            clerkUser.id,
                            {
                                _id: clerkUser.id,
                                name,
                                email,
                                image: clerkUser.imageUrl || ''
                            },
                            { upsert: true, new: true }
                        );
                    }
                } catch (clerkErr) {
                    console.error("Error fetching user from Clerk:", clerkErr.message);
                }
            }

            // Fallback to customerEmail only if account email is missing
            if (!email) {
                email = event.data?.customerEmail;
            }

            return { userEmail: email, userName: name };
        });

        const userEmail = userInfo?.userEmail;
        if (!userEmail) {
            console.error("No recipient email found for booking:", bookingId);
            return { error: "No recipient email found", bookingId };
        }

        // Step 3: Render and send confirmation email
        const emailResult = await step.run("send-email", async () => {
            const movie = booking.show?.movie || {};
            const theatre = booking.show?.theatre || {};
            const show = booking.show || {};

            const showDate = new Date(show.showDateTime).toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Kolkata'
            });

            const showTime = new Date(show.showDateTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
            });

            const posterUrl = movie.poster_path
                ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
                : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300';

            const theatreName = theatre.name || 'Cineverse Cinemas';
            const theatreAddress = [theatre.address, theatre.city].filter(Boolean).join(', ') || 'Main Screen';
            const formatBadge = [show.format || '2D', show.language || 'English'].join(' • ');
            const seatsHtml = (booking.bookedSeats || []).map(seat => `
                <span style="display:inline-block; background: linear-gradient(135deg, #22d3ee 0%, #0284c7 100%); color: #0b0f1a; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 13px; margin: 2px 4px 2px 0;">${seat}</span>
            `).join('');

            const ticketHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Your Movie Ticket - Cineverse</title>
            </head>
            <body style="margin: 0; padding: 24px 10px; background-color: #0b0f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td align="center">
                            <!-- Main Card -->
                            <table role="presentation" width="100%" style="max-width: 540px; background-color: #111827; border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 20px; overflow: hidden; box-shadow: 0 16px 36px rgba(0,0,0,0.6), 0 0 24px rgba(6, 182, 212, 0.12);" cellpadding="0" cellspacing="0" border="0">
                                
                                <!-- Header Logo & Status Banner -->
                                <tr>
                                    <td style="padding: 22px 28px; background: linear-gradient(135deg, #0f172a 0%, #082f49 100%); border-bottom: 1px solid rgba(34, 211, 238, 0.2);">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="left">
                                                    <span style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">CINE<span style="color: #22d3ee;">VERSE</span></span>
                                                </td>
                                                <td align="right">
                                                    <span style="display: inline-block; background-color: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid #06b6d4; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                                                        ● CONFIRMED
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Movie Info Section -->
                                <tr>
                                    <td style="padding: 24px 28px 16px 28px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td width="105" valign="top" style="padding-right: 18px;">
                                                    <img src="${posterUrl}" alt="${movie.title}" width="105" height="150" style="display: block; border-radius: 12px; object-fit: cover; border: 1px solid rgba(34, 211, 238, 0.2);" />
                                                </td>
                                                <td valign="top">
                                                    <div style="font-size: 12px; font-weight: 700; color: #22d3ee; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                                                        Movie Ticket
                                                    </div>
                                                    <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                                                        ${movie.title}
                                                    </h1>
                                                    <div style="margin-bottom: 12px;">
                                                        <span style="display: inline-block; background-color: rgba(6, 182, 212, 0.12); color: #38bdf8; border: 1px solid rgba(6, 182, 212, 0.3); padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 600;">
                                                            ${formatBadge}
                                                        </span>
                                                        ${movie.run_time ? `<span style="display: inline-block; background-color: #1e293b; color: #94a3b8; padding: 3px 8px; border-radius: 5px; font-size: 11px; margin-left: 4px;">${Math.floor(movie.run_time / 60)}h ${movie.run_time % 60}m</span>` : ''}
                                                    </div>
                                                    <div style="font-size: 13px; color: #94a3b8; line-height: 1.4;">
                                                        Enjoy your cinematic experience with premium sound and crystal visual clarity.
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Ticket Perforation Tear Line -->
                                <tr>
                                    <td style="padding: 6px 0;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td width="16" height="24" style="background-color: #0b0f1a; border-top-right-radius: 16px; border-bottom-right-radius: 16px; border-top: 1px solid rgba(34, 211, 238, 0.25); border-right: 1px solid rgba(34, 211, 238, 0.25); border-bottom: 1px solid rgba(34, 211, 238, 0.25);"></td>
                                                <td style="border-bottom: 2px dashed #1e293b;"></td>
                                                <td width="16" height="24" style="background-color: #0b0f1a; border-top-left-radius: 16px; border-bottom-left-radius: 16px; border-top: 1px solid rgba(34, 211, 238, 0.25); border-left: 1px solid rgba(34, 211, 238, 0.25); border-bottom: 1px solid rgba(34, 211, 238, 0.25);"></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Ticket Details Grid -->
                                <tr>
                                    <td style="padding: 16px 28px 24px 28px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0c1322; border: 1px solid #1e293b; border-radius: 14px; padding: 18px;">
                                            <!-- Cinema Hall -->
                                            <tr>
                                                <td colspan="2" style="padding-bottom: 16px; border-bottom: 1px solid #1e293b;">
                                                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                                        Cinema Hall / Theatre
                                                    </div>
                                                    <div style="font-size: 16px; font-weight: 800; color: #ffffff;">
                                                        📍 ${theatreName}
                                                    </div>
                                                    <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                                                        ${theatreAddress}
                                                    </div>
                                                </td>
                                            </tr>

                                            <!-- Date & Time Row -->
                                            <tr>
                                                <td width="50%" style="padding: 14px 10px 14px 0; border-bottom: 1px solid #1e293b;">
                                                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                                        Show Date
                                                    </div>
                                                    <div style="font-size: 15px; font-weight: 700; color: #ffffff;">
                                                        📅 ${showDate}
                                                    </div>
                                                </td>
                                                <td width="50%" style="padding: 14px 0 14px 10px; border-bottom: 1px solid #1e293b;">
                                                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                                        Show Time
                                                    </div>
                                                    <div style="font-size: 15px; font-weight: 700; color: #ffffff;">
                                                        ⏰ ${showTime}
                                                    </div>
                                                </td>
                                            </tr>

                                            <!-- Seats & Total Amount Row -->
                                            <tr>
                                                <td width="50%" style="padding: 14px 10px 4px 0;">
                                                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                                                        Booked Seats (${booking.bookedSeats?.length || 1})
                                                    </div>
                                                    <div>
                                                        ${seatsHtml}
                                                    </div>
                                                </td>
                                                <td width="50%" style="padding: 14px 0 4px 10px;" valign="top">
                                                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                                        Total Paid
                                                    </div>
                                                    <div style="font-size: 22px; font-weight: 900; color: #22d3ee;">
                                                        ₹${booking.amount}
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Booking Reference ID -->
                                <tr>
                                    <td style="padding: 0 28px 26px 28px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0e1726; border: 1px solid #1e293b; border-radius: 12px; padding: 12px 18px;">
                                            <tr>
                                                <td valign="middle">
                                                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
                                                        Booking Reference ID
                                                    </div>
                                                    <div style="font-size: 14px; font-family: monospace; font-weight: 700; color: #38bdf8; margin-top: 4px;">
                                                        ${booking._id}
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Card Footer -->
                                <tr>
                                    <td align="center" style="padding: 16px 28px; background-color: #0a0f1d; border-top: 1px solid #1e293b;">
                                        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                                            Have questions? Please reach out to <a href="mailto:ishansaraswat68@gmail.com" style="color: #22d3ee; text-decoration: none;">support@cineverse.com</a><br/>
                                            &copy; 2026 Cineverse Entertainment Inc. All rights reserved.
                                        </p>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            `;

            const sendResult = await sendEmail({
                to: userEmail,
                subject: `🎟️ Movie Ticket Confirmed: "${movie.title || 'Movie'}" at ${theatreName}`,
                body: ticketHtml
            });

            console.log(`✅ Inngest cinema ticket email sent strictly to booked account: ${userEmail}`);
            return sendResult;
        });

        return { success: true, userEmail, messageId: emailResult?.messageId };
    }
);

// Inngest Watchdog Function
const seatLockExpiryWatchdog = inngest.createFunction(
  {
    id: "seat-lock-expiry-watchdog",
    triggers: [{ event: "booking/lock.created" }]
  },
  async ({ event, step }) => {
    const { bookingId, showId, seats, userId, sessionId } = event.data;
    const ttlSec = event.data.ttlSeconds || parseInt(process.env.SEAT_LOCK_TTL_SECONDS, 10) || 300;

    // 1. Sleep dynamically matching the 5-minute Redis lock TTL
    await step.sleep("wait-for-checkout-expiration", `${ttlSec}s`);

    // 2. Check the booking payment status in MongoDB
    const booking = await step.run("check-payment-status", async () => {
      return await Booking.findById(bookingId);
    });

    // 3. If booking doesn't exist or is not paid, release seats and expire Stripe checkout!
    if (!booking || !booking.isPaid) {
      await step.run("release-abandoned-seats", async () => {
        // Safe Lua release in Redis
        await releaseSeatLocks(showId, seats, userId);

        // Mark booking as expired in MongoDB
        await Booking.findByIdAndUpdate(bookingId, { status: "expired" });

        // Manually expire the Stripe session at the 5-minute mark
        if (sessionId) {
          try {
            const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
            await stripeInstance.checkout.sessions.expire(sessionId);
            console.log(`🔒 Stripe Checkout Session ${sessionId} expired at 5-minute mark`);
          } catch (stripeErr) {
            console.warn("Stripe session expiration note:", stripeErr.message);
          }
        }

        console.log(`⏰ Seats auto-released for expired booking: ${bookingId}`);
      });
    }
  }
);


// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdate, sendBookingConfirmationEmail,seatLockExpiryWatchdog];