import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/booking.js";
import Show from "../models/show.js";
import Movie from "../models/movie.js";
import sendEmail from "../config/nodemailer.js";
import { clerkClient } from "@clerk/express";

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

        const booking = await Booking.findById(bookingId).populate({
            path: 'show',
            populate: { path: "movie", model: "Movie" }
        });

        if (!booking) {
            console.error("Booking not found for Inngest event:", bookingId);
            return;
        }

        // Safely extract Clerk userId without losing it to a null populate
        const userId = (typeof booking.user === 'string' ? booking.user : booking.user?._id) || event.data?.userId;

        const recipientEmails = new Set();
        if (event.data?.customerEmail) recipientEmails.add(event.data.customerEmail);

        let userName = 'Movie Lover';

        // 1. Check MongoDB User collection first
        if (userId) {
            try {
                const dbUser = await User.findById(userId);
                if (dbUser?.email) {
                    recipientEmails.add(dbUser.email);
                    if (dbUser.name) userName = dbUser.name;
                }
            } catch (err) {
                console.warn("MongoDB user lookup error:", err.message);
            }
        }

        // 2. Fetch directly from Clerk
        if (userId) {
            try {
                const clerkUser = await clerkClient.users.getUser(userId);
                const clerkEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
                if (clerkEmail) recipientEmails.add(clerkEmail);
                if (clerkUser.firstName || clerkUser.lastName) {
                    userName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
                }

                // Automatically save user to MongoDB for future queries
                if (clerkUser.id && clerkEmail) {
                    await User.findByIdAndUpdate(
                        clerkUser.id,
                        {
                            _id: clerkUser.id,
                            name: userName,
                            email: clerkEmail,
                            image: clerkUser.imageUrl || ''
                        },
                        { upsert: true, new: true }
                    );
                }
            } catch (clerkErr) {
                console.error("Error fetching user from Clerk:", clerkErr.message);
            }
        }

        if (recipientEmails.size === 0) {
            console.error("No recipient email found for booking:", bookingId);
            return;
        }

        const emailList = Array.from(recipientEmails).join(', ');

        await sendEmail({
            to: emailList,
            subject: `Payment Confirmation : "${booking.show.movie.title}" Booked!`,
            body: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                <h2>Hi ${userName},</h2>
                <p>Your booking for <strong style="color: #F84565;">${booking.show.movie.title}</strong> is confirmed.</p>

                <p>
                    <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString(
                        'en-US',
                        { timeZone: 'Asia/Kolkata' }
                    )}<br/>

                    <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString(
                        'en-US',
                        { timeZone: 'Asia/Kolkata' }
                    )}<br/>

                    <strong>Seats:</strong> ${booking.bookedSeats.join(', ')}<br/>
                    <strong>Total Amount:</strong> ₹${booking.amount}
                </p>
                <p>Enjoy the show! 🍿</p>
                <p>Thanks for booking with us!<br/>~ Cineverse Team</p>
            </div>
            `
        });
        console.log(`✅ Inngest email sent to: ${emailList}`);
    }
);

// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdate, sendBookingConfirmationEmail];