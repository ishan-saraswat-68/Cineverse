import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import theatreRouter from "./routes/theatreRoutes.js";
import { stripeWebHooks } from "./controllers/stripeWebHooks.js";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");


dotenv.config();

const app = express();
const port = 3000;
await connectDB();

// Stripe Webhooks Route 
app.use('/api/stripe',express.raw({type:'application/json'}),stripeWebHooks);

//middleware
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// api routes
app.get("/",(req,res)=>{
    res.send("server is live goodboy");
});

app.use("/api/inngest",serve({ client: inngest, functions }));
app.use('/api/show', showRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/admin',adminRouter);
app.use('/api/user',userRouter);
app.use('/api/theatre',theatreRouter);

app.listen(port,()=>{
    console.log(`server is listening at http://localhost:${port}`);
});