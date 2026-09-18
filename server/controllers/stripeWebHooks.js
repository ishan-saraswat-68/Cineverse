import stripe from "stripe";
import Booking from "../models/booking.js"

export const stripeWebHooks = async(req,res)=>{
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];

    let event;

    try{
        event = stripeInstance.webhooks.constructEvent(req.body,sig,process.env.STRIPE_WEBHOOK_SECRET)
    }catch(error){
        return res.status(400).send(`Webhook error ${error.message}`)
    }
    try {
        switch(event.type){
            case 'payment_instance.succeeded':{
                const paymentIntent = event.data.object;
                const sessionList = await stripeInstance.checkout.sessions.list({
                    payment_intent:paymentIntent.id
                })
                const session = sessionList.data[0];
                const { bookingId } = session.metadata;
                await Booking.findByIdAndUpdate(bookingId,{
                    isPaid : true,
                    paymentLink :""
                })
                break;
            }   
            default:
                console.log(`unHandled event type ${event.type}`);
                break;
                
        }
        res.json({success : true});
    } catch (error) {
        console.error("webhook processing error: ",error);
        res.status(500).json({success: false, message: "Internal Server Error"})

        
    }
}
