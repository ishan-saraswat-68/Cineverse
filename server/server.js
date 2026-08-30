import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";

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
    res.send("server is live with moves");
});

app.use("/api/user",serve({ client: inngest, functions }));

app.listen(port,()=>{
    console.log(`server is listening at http://localhost:${port}`);
});