# 🎬 Cineverse V2 — Real-Time Movie Ticket Booking Platform

> A full-stack, enterprise-ready movie ticketing and theater management web application built with **React 19**, **Express 5**, **Socket.IO**, **Redis**, **MongoDB Atlas**, **Clerk Auth**, **Inngest**, and **Stripe**.

---

## 🌟 Key Highlights & Features

- ⚡ **Real-Time Distributed Seat Locking**:
  - Live per-click seat reservation with milliseconds synchronization across all users via **Socket.IO** and **Upstash Redis**.
  - Visual seat lock states (Available, Your Selection, Locked/Amber by another customer, Booked).
  - Configurable countdown TTL (default **300 seconds / 5 minutes**).
  - Automatic seat unlock on socket disconnect (tab closed, page refreshed, navigation away).
- 💳 **Stripe Checkout & Automated Inngest Watchdog**:
  - Direct integration with Stripe Checkout sessions.
  - Background Inngest watchdog automatically cancels abandoned Stripe checkout sessions and releases locked seats upon TTL expiration.
  - Production-ready Stripe webhooks (`checkout.session.completed`) handling database updates and ticket fulfillment.
- 🍿 **Dynamic Theaters & Seating Tiers**:
  - Multi-theater support with customized screen layouts.
  - Tiered seat pricing (e.g., VIP, Premium, Standard) with automated total calculation.
- 🎬 **The Movie Database (TMDB) Integration**:
  - Live movie metadata, HD backdrop posters, cast, trailers, runtime, and genre indexing.
- 🔐 **Clerk Authentication & Webhooks Sync**:
  - Seamless authentication via Clerk (`@clerk/react` & `@clerk/express`).
  - Automatic MongoDB user synchronisation (`clerk/user.created`, `clerk/user.updated`, `clerk/user.deleted`) using Inngest event triggers.
- 📧 **Automated Email Ticketing**:
  - Instant HTML email confirmations sent upon successful payment via **Nodemailer** / **Brevo SMTP**.
- 🛠️ **Admin Portal & Analytics**:
  - Role-protected admin dashboard (`privateMetadata: { role: 'admin' }`).
  - Manage theaters, schedule movie shows, view real-time occupancy, revenue statistics, and booking histories.
- ❤️ **User Features**:
  - Personal ticket booking history with QR/status verification.
  - Add to favorites list.

---

## 🏗️ Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client ["Client (React 19 + Vite + Tailwind CSS)"]
        UI[User / Browser]
        SocketClient[Socket.IO Client]
        ClerkUI[Clerk React Auth]
    end

    subgraph Backend ["Backend Server (Node.js + Express 5)"]
        APIServer[Express REST API]
        SocketServer[Socket.IO Server]
        AdminAuth[Clerk Auth Middleware]
    end

    subgraph Infrastructure ["Cloud Infrastructure & Third-Party Services"]
        Redis[(Upstash Redis\nDistributed Locks)]
        MongoDB[(MongoDB Atlas\nPrimary Database)]
        StripeGateway[Stripe Checkout & Webhooks]
        InngestEngine[Inngest Background Workers & Watchdogs]
        BrevoSMTP[Brevo / SMTP Email Service]
        TMDB[TMDB Movie API]
    end

    UI -->|HTTP Requests| APIServer
    UI <-->|WebSockets| SocketServer
    SocketServer <-->|Lock / Unlock / TTL| Redis
    APIServer -->|Queries & Updates| MongoDB
    APIServer -->|Fetch Metadata| TMDB
    APIServer -->|Create Checkout Session| StripeGateway
    StripeGateway -->|Webhook confirmation| APIServer
    APIServer -->|Dispatch Events| InngestEngine
    InngestEngine -->|Watchdog / Release Lock| Redis
    InngestEngine -->|Sync Users & Cleanup| MongoDB
    APIServer -->|Send Ticket Confirmation| BrevoSMTP
```

---

## 📂 Project Structure

```text
cineverse_V2/
├── .env.example             # Root reference environment template
├── .gitignore               # Protected secrets and build artifacts
├── README.md                # Project documentation
│
├── client/                  # Frontend Single Page Application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── assets/          # Icons, logos, and local media
│   │   ├── components/      # Reusable UI components (Navbar, Footer, etc.)
│   │   ├── context/         # React Context (AppContext, Global State)
│   │   ├── pages/           # Pages (Home, Movies, SeatLayout, Bookings, etc.)
│   │   │   └── admin/       # Admin Dashboard, Theatres, Shows, Bookings
│   │   ├── App.jsx          # Routes and Layouts
│   │   └── main.jsx         # App bootstrapping and Clerk Provider
│   ├── .env.example         # Client environment template
│   ├── package.json         # React 19, Tailwind v4, Vite dependencies
│   └── vite.config.js       # Vite configuration
│
└── server/                  # Backend REST API & Real-time Server
    ├── config/              # MongoDB, Upstash Redis, and Nodemailer configs
    ├── controllers/         # Business logic (admin, booking, show, theatre, user)
    ├── inngest/             # Inngest background event handlers and watchdogs
    ├── middleware/          # Clerk admin authorization middleware
    ├── models/              # Mongoose database schemas (Booking, Movie, Show, Theatre, User)
    ├── routes/              # Express API route declarations
    ├── .env.example         # Server environment template
    ├── package.json         # Express 5, Socket.IO, Redis, Stripe dependencies
    └── server.js            # Main HTTP & Socket.IO server entry point
```

---

## 📋 Prerequisites

Before running the application, ensure you have installed:

- **Node.js**: `v18.0.0` or higher
- **npm** (comes with Node) or **pnpm** / **yarn**
- **Git**

And have active accounts/keys for:
1. **[MongoDB Atlas](https://www.mongodb.com/atlas)** — Free cluster connection URI.
2. **[Clerk](https://clerk.com/)** — User authentication keys (`Publishable Key` & `Secret Key`).
3. **[Upstash Redis](https://upstash.com/)** — Free serverless Redis instance (`rediss://...`).
4. **[Stripe](https://stripe.com/)** — Test API keys (`Publishable Key`, `Secret Key`, `Webhook Secret`).
5. **[TMDB](https://www.themoviedb.org/settings/api)** — The Movie Database API Read Access Token or API Key.
6. **[Brevo (formerly Sendinblue)](https://www.brevo.com/)** or any SMTP provider for sending booking confirmation emails.
7. **[Inngest](https://www.inngest.com/)** — Background functions & workflows.

---

## ⚙️ Quick Setup Guide

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/cineverse_V2.git
cd cineverse_V2
```

---

### 2. Configure Backend Environment

Navigate to the `server` directory and copy the environment template:

```bash
cd server
cp .env.example .env
```

Open `server/.env` and provide your credentials:

```env
# Server Configuration
PORT=3000
CLIENT_URL=http://localhost:5173

# MongoDB Atlas Database URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/cineverse

# Clerk Authentication Keys
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Inngest Background Jobs
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=signkey-prod-your_inngest_signing_key

# TMDB Movie Database API
TMDB_API_KEY=your_tmdb_api_key_or_bearer_token

# Stripe Payment Gateway
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Upstash Redis for Real-Time Seat Locking
REDIS_URL=rediss://default:password@host.upstash.io:6379
SEAT_LOCK_TTL_SECONDS=300

# Nodemailer / Brevo SMTP Settings
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SENDER_EMAIL=your_verified_sender@domain.com
```

Install server dependencies:

```bash
npm install
```

---

### 3. Configure Frontend Environment

In another terminal tab, navigate to the `client` directory:

```bash
cd client
cp .env.example .env
```

Open `client/.env` and update the variables:

```env
# Backend API & WebSocket Server
VITE_BASE_URL=http://localhost:3000

# Clerk Publishable Key (Matches your Clerk Dashboard)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Display Currency Symbol
VITE_CURRENCY='₹'

# TMDB Image Base URL
VITE_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/original

# Seat Lock TTL in Seconds
VITE_SEAT_LOCK_TTL_SECONDS=300
```

Install client dependencies:

```bash
npm install
```

---

### 4. Admin Role Configuration (Clerk)

To grant an account access to the **Admin Dashboard** (`/admin`):

1. Go to your **[Clerk Dashboard](https://dashboard.clerk.com/)**.
2. Select your application and click **Users**.
3. Select your user account.
4. Scroll down to **Metadata** and click **Edit** on **Private Metadata**.
5. Add the role parameter:
   ```json
   {
     "role": "admin"
   }
   ```
6. Save changes. You can now access the Admin portal at `/admin`.

---

### 5. Running Inngest & Stripe Webhooks Locally

#### Inngest Dev Server (Optional for local testing)
Inngest handles background tasks like Clerk user sync and payment watchdogs:
```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

#### Stripe CLI for Local Webhooks
To forward Stripe checkout events to your local server:
```bash
stripe listen --forward-to http://localhost:3000/api/stripe
```
Copy the webhook signing secret (starts with `whsec_...`) printed by the CLI into `server/.env` under `STRIPE_WEBHOOK_SECRET`.

---

### 6. Starting the Application

#### Start the Server (Terminal 1):
```bash
cd server
npm run server
```
> Server and WebSocket listening at: `http://localhost:3000`

#### Start the Client (Terminal 2):
```bash
cd client
npm run dev
```
> Vite Client running at: `http://localhost:5173`

---

## 📡 API Endpoints Overview

| Route | Method | Access | Description |
| :--- | :---: | :---: | :--- |
| `GET /` | `GET` | Public | Root health check |
| `GET /api/health-check` | `GET` | Public | Verify server status and configured services |
| `GET /api/show/all` | `GET` | Public | Fetch all available movie shows |
| `GET /api/show/:id` | `GET` | Public | Fetch single show details & occupied seats |
| `POST /api/booking/create` | `POST` | User Auth | Lock seats & initiate Stripe checkout session |
| `GET /api/booking/user-bookings` | `GET` | User Auth | Fetch current user's booking history |
| `GET /api/theatre/all` | `GET` | Public | Get all theaters |
| `POST /api/theatre/add` | `POST` | Admin Only | Create a new theater and custom seating layout |
| `POST /api/admin/add-shows` | `POST` | Admin Only | Add show using TMDB movie ID and theater ID |
| `GET /api/admin/dashboard` | `GET` | Admin Only | View total revenue, ticket sales, and occupancy |
| `POST /api/stripe` | `POST` | Stripe Webhook | Process successful Stripe checkout session |
| `ALL /api/inngest` | `ALL` | Inngest Engine | Background job dispatch & execution |

---

## 🔄 Real-Time Socket.IO Events

The application uses Socket.IO rooms partitioned by `show:<showId>` for real-time seat locking:

- **`join:show`** `(showId)`: Join the real-time room for a movie show and receive current locks.
- **`initial-locks`** `(locks)`: Sent to the client on join, contains active Redis seat locks and remaining TTL.
- **`seat:lock`** `({ showId, seatId, userId })`: Emitted when user clicks an available seat. Acquires Redis lock and broadcasts to the room.
- **`seats-locked`** `({ showId, seats, userId, ttlMs })`: Broadcast to all room members to render seats as locked/amber.
- **`seat:unlock`** `({ showId, seatId, userId })`: Emitted when user deselects a seat to release the lock immediately.
- **`seats-released`** `({ showId, seats })`: Broadcast to all room members to restore seats back to available state.
- **`disconnect`**: Server automatically detects socket closure and frees all seats locked by that socket session.

---

## 🛡️ Health Check

To verify your backend environment variables and database connections, visit:
```text
http://localhost:3000/api/health-check
```
It returns JSON showing which services (MongoDB, Clerk, Stripe, Redis, Inngest, SMTP) have valid configurations.

---

## 📜 License

This project is licensed under the **ISC License**.
