import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import { clerkMiddleware } from '@clerk/express';
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import theatreRouter from "./routes/theatreRoutes.js";
import { stripeWebHooks } from "./controllers/stripeWebHooks.js";
import redisClient, { getShowLocks, acquireSeatLocks, releaseSeatLocks } from "./config/redis.js";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const app = express();
const port = process.env.PORT || 3000;
connectDB();

// 1. Create HTTP Server & Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow any local or production origin to prevent CORS blocking WebSockets
      callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Attach io to Express app so controllers can access req.app.get("io")
app.set("io", io);

// 2. Socket.IO Room Management & Per-Click Real-Time Locking
io.on("connection", (socket) => {
  console.log(`🔌 [Socket.IO] Client connected: ${socket.id}`);
  // Track seats locked by this socket session for disconnect cleanup
  const socketLocks = new Map();

  // User joins a specific show room
  socket.on("join:show", async (showId) => {
    socket.join(`show:${showId}`);
    console.log(`👤 [Socket.IO] Client ${socket.id} joined room: show:${showId}`);
    
    // Send active Redis locks to this user immediately on join
    try {
      const activeLocks = await getShowLocks(showId);
      socket.emit("initial-locks", activeLocks);
      console.log(`📤 [Socket.IO] Sent initial locks to ${socket.id} for show:${showId}:`, Object.keys(activeLocks));
    } catch (err) {
      console.error("Error sending initial locks:", err);
    }
  });

  socket.on("leave:show", (showId) => {
    socket.leave(`show:${showId}`);
    console.log(`👋 [Socket.IO] Client ${socket.id} left room: show:${showId}`);
  });

  // Real-Time Per-Click Seat Lock
  socket.on("seat:lock", async ({ showId, seatId, userId }) => {
    try {
      const lockOwner = userId || socket.id;
      const ttlMs = (parseInt(process.env.SEAT_LOCK_TTL_SECONDS, 10) || 300) * 1000;
      const acquired = await acquireSeatLocks(showId, [seatId], lockOwner, ttlMs);

      if (acquired) {
        if (!socketLocks.has(showId)) {
          socketLocks.set(showId, new Set());
        }
        socketLocks.get(showId).add({ seatId, userId: lockOwner });

        // Broadcast to everyone in the show room (Amber for other users)
        io.to(`show:${showId}`).emit("seats-locked", {
          showId,
          seats: [seatId],
          userId: lockOwner,
          ttlMs,
        });

        socket.emit("seat:lock-success", { seatId });

        // Auto-broadcast release when Redis TTL expires
        setTimeout(async () => {
          try {
            const key = `lock:show:${showId}:seat:${seatId}`;
            const stillLocked = await redisClient.get(key);
            if (!stillLocked) {
              if (socketLocks.has(showId)) {
                const set = socketLocks.get(showId);
                for (const item of set) {
                  if (item.seatId === seatId) set.delete(item);
                }
              }
              io.to(`show:${showId}`).emit("seats-released", {
                showId,
                seats: [seatId],
              });
              console.log(`⏰ [Socket.IO] Broadcasted TTL auto-release for seat ${seatId}`);
            }
          } catch (e) {
            console.error("TTL auto-release check error:", e);
          }
        }, ttlMs + 500);
      } else {
        socket.emit("seat:lock-failed", {
          seatId,
          message: `Seat ${seatId} was just taken by another customer.`,
        });
      }
    } catch (err) {
      console.error("Socket seat:lock error:", err);
      socket.emit("seat:lock-failed", { seatId, message: "Failed to lock seat" });
    }
  });

  // Real-Time Per-Click Seat Unlock (User deselects seat)
  socket.on("seat:unlock", async ({ showId, seatId, userId }) => {
    try {
      const lockOwner = userId || socket.id;
      await releaseSeatLocks(showId, [seatId], lockOwner);

      if (socketLocks.has(showId)) {
        const set = socketLocks.get(showId);
        for (const item of set) {
          if (item.seatId === seatId) set.delete(item);
        }
      }

      // Broadcast release to everyone (turns back to Available)
      io.to(`show:${showId}`).emit("seats-released", {
        showId,
        seats: [seatId],
      });

      socket.emit("seat:unlock-success", { seatId });
    } catch (err) {
      console.error("Socket seat:unlock error:", err);
    }
  });

  // Auto-cleanup on disconnect (closed tab, refreshed, navigated away)
  socket.on("disconnect", async () => {
    for (const [showId, locksSet] of socketLocks.entries()) {
      if (locksSet && locksSet.size > 0) {
        for (const { seatId, userId } of locksSet) {
          try {
            await releaseSeatLocks(showId, [seatId], userId);
            io.to(`show:${showId}`).emit("seats-released", {
              showId,
              seats: [seatId],
            });
          } catch (e) {
            console.error("Error releasing seat on disconnect:", e);
          }
        }
      }
    }
  });
});

// Stripe Webhooks Route (raw body)
app.post('/api/stripe', express.raw({ type: 'application/json' }), stripeWebHooks);

// Middleware
app.use(cors());
app.use(express.json());

// Inngest endpoint
app.use("/api/inngest", serve({ client: inngest, functions }));

app.use(clerkMiddleware());

// API Routes
app.use('/api/show', showRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);
app.use('/api/theatre', theatreRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
});

// Start Server (using server.listen for WebSockets)
server.listen(port, () => {
  console.log(` Server & Socket.IO running at http://localhost:${port}`);
});

export default app;
