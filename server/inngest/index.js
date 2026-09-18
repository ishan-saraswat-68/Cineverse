import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/booking.js";
import sendEmail from "../config/nodemailer.js";
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
    { id: "send-booking-confirmation-email" },
    { event: "app/show.booked" },
    async ({ event, step }) => {
        const { bookingId } = event.data;

        const booking = await Booking.findById(bookingId).populate({
            path: 'show',
            populate: { path: "movie", model: "Movie" }
        }).populate('user');

        await sendEmail({
            to: booking.user.email,
            subject: `Payment Confirmation : "${booking.show.movie.title}" Booked!`,
            body: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                <h2>Hi ${booking.user.name},</h2>
                <p>Your booking for <strong style="color: #F84565;">${booking.show.movie.title
                    }</strong> is confirmed.</p>

                <p>
                    <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString(
                    'en-US',
                    { timeZone: 'Asia/Kolkata' }
                )
                    }<br/>

                    <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString(
                    'en-US',
                    { timeZone: 'Asia/Kolkata' }
                )
                    }
                </p>
                <p>Enjoy the show! 🍿</p>
                <p>Thanks for booking with us!<br/>~ QuickShow Team</p>
                </div>
            `
        })

    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdate, sendBookingConfirmationEmail];