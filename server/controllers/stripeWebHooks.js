import stripe from "stripe";
import Booking from "../models/booking.js";
import { inngest } from "../inngest/index.js";

export const stripeWebHooks = async (req, res) => {
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        console.error("Webhook signature verification failed:", error.message);
        return res.status(400).send(`Webhook error: ${error.message}`);
    }

    try {
        switch (event.type) {
            // ✅ 1. Primary Stripe Checkout Event
            case 'checkout.session.completed': {
                const session = event.data.object;
                const bookingId = session.metadata?.bookingId;
                const userId = session.metadata?.userId;
                const customerEmail = session.customer_details?.email || session.customer_email;
                if (bookingId) {
                    await Booking.findByIdAndUpdate(bookingId, {
                        isPaid: true,
                        paymentLink: ""
                    });

                    // Send Booking Confirmation Email through Inngest
                    await inngest.send({
                        name: 'app/show.booked',
                        data: { bookingId, userId, customerEmail }
                    });
                    console.log(`✅ Booking ${bookingId} marked as PAID via checkout.session.completed`);
                }
                break;
            }

            // ✅ 2. Payment Intent Event (Fallback)
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                const sessionList = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntent.id
                });
                const session = sessionList.data[0];
                const bookingId = session?.metadata?.bookingId;
                const userId = session?.metadata?.userId;
                const customerEmail = session?.customer_details?.email || session?.customer_email;
                if (bookingId) {
                    await Booking.findByIdAndUpdate(bookingId, {
                        isPaid: true,
                        paymentLink: ""
                    });

                    // Send Booking Confirmation Email through Inngest
                    await inngest.send({
                        name: 'app/show.booked',
                        data: { bookingId, userId, customerEmail }
                    });
                    console.log(`✅ Booking ${bookingId} marked as PAID via payment_intent.succeeded`);
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
                break;
        }

        res.json({ received: true });
    } catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
