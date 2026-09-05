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

dotenv.config();

const app = express();
const port = 3000;
connectDB();

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
app.use('api/admin',adminRouter);
app.use('/api/user',userRouter);

app.listen(port,()=>{
    console.log(`server is listening at http://localhost:${port}`);
});