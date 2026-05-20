# 🚖 Gigo — Decentralized Boda Mobility Infrastructure

<p align="center">
  <img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/185bab85-f910-4721-a08c-650520fb5133" />
</p>

<p align="center">
  <strong>Building the future of trusted mobility for boda boda ecosystems using Algorand Blockchain.</strong>
</p>

---

# 🌍 What is Gigo?

Gigo is a decentralized ride-sharing and mobility infrastructure platform designed for **boda boda ecosystems** and informal transportation networks in emerging markets like **Uganda**, **Kenya**, and **East Africa**.

Traditional transport systems in these regions often face:

* ❌ Unverified riders
* ❌ Unsafe ride experiences
* ❌ Cash disputes
* ❌ No digital identity
* ❌ No payment transparency

Gigo solves these problems using:

* ⚡ Algorand Smart Contracts
* 🪙 ASA-based ride credits (GIGC)
* 📦 IPFS decentralized storage
* 🤖 AI-powered mobility insights
* 📱 Progressive Web App (PWA)

---

# ✨ Core Features

## 🪙 GIGC Ride Credit System

Gigo uses a native Algorand ASA token called **GIGC**.

### What GIGC does:

* Ride escrow payments
* Instant rider payouts
* Rewards & incentives
* Membership benefits
* Low-fee transactions

### Ride Flow

```text
Passenger books ride
↓
GIGC locked in escrow
↓
Ride completed
↓
Smart contract releases payout
```

---

## 🔐 Smart Contract Escrow

All payments are secured through Algorand smart contracts.

### On-chain:

* Ride escrow creation
* GIGC payment locking
* Escrow release
* NFT/ASA verification

### Off-chain:

* GPS tracking
* Ride matching
* Notifications
* Analytics
* Weather surge logic

This hybrid architecture gives:

* ⚡ Fast UX
* 🔒 Secure payments
* 📱 Smooth mobile experience

---

# 🛵 Built for the Boda Boda Ecosystem

<p align="center">
 <img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/2f8abda0-5eb4-4108-b947-0d062b68913f" />
</p>

Gigo prioritizes:

* 🛵 Boda rides
* 🚗 Car rides
* ⚡ EV rides

### Rider Verification Includes:

* Driving License
* National ID
* Vehicle Registration
* Insurance
* Rider Profile Photo

Only approved riders can receive bookings.

---

# 🤖 AI-Powered Mobility Intelligence

Gigo integrates AI to improve transportation efficiency.

### AI Features:

* 📈 Demand prediction
* 🌦 Weather-based surge analysis
* 📍 Rider hotspot suggestions
* ⛽ Fuel/range alerts
* 🎙 Voice booking automation

Example:

> “High ride demand expected near Makerere University during evening rush hour.”

---

# 📦 Decentralized Storage with IPFS

We use Pinata IPFS for decentralized asset storage.

Stored on IPFS:

* Rider verification documents
* NFT metadata
* Ride receipts
* Uploaded assets

### Architecture

```text
Frontend
↓
Backend API
↓
Pinata IPFS
↓
CID Generated
↓
CID stored in backend/blockchain
```

---

# 🏗 System Architecture

<p align="center">
<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/0ef7a6d4-4141-4894-9e2b-7b80652ff1f1" />


UPDATED ARCHITECTURE
<img width="1536" height="1024" alt="ChatGPT Image" src="https://github.com/user-attachments/assets/2207e643-05c8-46b7-9764-19b8da7e0949" />
 

</p>

```text
                                      ┌──────────────────────────┐
                                      │      GigGo Users         │
                                      │ Passengers • Drivers     │
                                      │ Merchants • Admins       │
                                      └────────────┬─────────────┘
                                                   │
                                                   ▼
                           ┌──────────────────────────────────────┐
                           │        React PWA Frontend            │
                           │ Customer Dashboard • Driver Panel    │
                           │ Wallet Connect • Booking UI          │
                           │ GIGC Top-Up • Merchant Features      │
                           └────────────────┬─────────────────────┘
                                            │
                 ┌──────────────────────────┼──────────────────────────┐
                 ▼                          ▼                          ▼

      ┌───────────────────┐     ┌────────────────────┐     ┌────────────────────┐
      │ Wallet Integration│     │  Node.js Backend   │     │ AI Recommendation  │
      │ Pera • Defly      │     │ Express + MongoDB  │     │ & Automation Layer │
      │ WalletConnect     │     │ Authentication API │     │ Smart Matching     │
      └─────────┬─────────┘     └─────────┬──────────┘     └────────────────────┘
                │                         │
                ▼                         ▼
     ┌────────────────────┐    ┌──────────────────────────┐
     │ Algorand Blockchain│    │   Transaction Services   │
     │ ASA Infrastructure │    │ Booking • Ride Status    │
     │ Smart Contracts    │    │ Notifications • Escrow   │
     └─────────┬──────────┘    └──────────┬───────────────┘
               │                          │
      ┌────────┼─────────┐                │
      ▼                  ▼                ▼

┌──────────────────┐  ┌──────────────────┐   ┌────────────────────┐
│ GIGC ASA Token   │  │ Self-Service     │   │ MongoDB Database   │
│ Payments         │  │ASA Top-Up System │   │ Users • Rides      │
│ Rewards • Payouts│  │Auto Verification │   │ Wallet Records     │
└─────────┬────────┘  │ Treasury Transfer│   │Transactions        │
          │           └──────────────────┘   └────────────────────┘
          │
          ▼
┌────────────────────┐
│ Pinata IPFS Storage│
│ KYC • Documents    │
│ Ride Proofs        │
│ Metadata Storage   │
└────────────────────┘
```

---

# ⚙️ Tech Stack

| Layer           | Technology                       |
| --------------- | -------------------------------- |
| Frontend        | React + Framer Motion + Tailwind |
| Backend         | Node.js + Express                |
| Blockchain      | Algorand                         |
| Smart Contracts | Algopy                           |
| Storage         | IPFS + Pinata                    |
| Database        | MongoDB                          |
| Wallet          | Pera Wallet                      |
| AI              | Groq AI + OpenRoute              |
| Deployment      |Vercel + Render + Algorand testnet|

---

# 📂 Project Structure

```bash
/projects/frontend   # Passenger & Rider dashboards
/projects/backend    # AI, APIs, Realtime Logic
/projects/contracts  # Algorand Smart Contracts
```

---

# 🚀 Quick Setup

## 1️⃣ Frontend Environment

`/frontend/.env`

```env
VITE_BACKEND_URL=
VITE_RIDE_APP_ID=
VITE_GIGC_ASA_ID=762258472
```

---

## 2️⃣ Backend Environment

`/backend/.env`

```env
MONGODB_URI=
GROQ_API_KEY=
PINATA_JWT=
```

---

# 🪙 GIGC ASA Information

| Property   | Value       |
| ---------- | ----------- |
| Asset Name | Gigo Credit |
| Ticker     | GIGC        |
| ASA ID     | 762258472   |

---

# 📱 Progressive Web App (PWA)

Gigo works like a native mobile app.

### Features:

* Installable on Android
* Offline-friendly UI
* Mobile-first design
* Lightweight performance

---

# 🔥 Why Gigo Matters

Gigo is not just another ride-sharing app.

It is:

> “A decentralized mobility infrastructure platform for informal transportation ecosystems.”

Our mission is to modernize boda boda transportation with:

* trust
* verification
* secure payments
* decentralized ownership

---

# 🌍 Future Vision

* 🌎 Expansion across East Africa
* 🧠 Smarter AI mobility optimization
* 🪪 Decentralized rider identity
* 📡 Offline-first ride infrastructure
* ⚡ Mainnet deployment

---

# 👨‍💻 Built By

### Shaik Ishaq

### K Dhanu

> Pushing the limits of Web3 mobility infrastructure.

---

# ⭐ Powered By

* Algorand Blockchain
* Pera Wallet
* Pinata IPFS
* Groq AI
* React Ecosystem
