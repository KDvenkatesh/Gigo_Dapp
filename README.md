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


</p>



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

---

# 🚀 Setup Guide

## 📋 Prerequisites

Before you begin, ensure you have installed:

- **Node.js** (v18+) and npm
- **Python** (v3.10+) - For smart contracts
- **Git**
- **Wallet**: [Pera Wallet](https://perawallet.app/) or [Defly](https://www.defly.app/)

---

## 1️⃣ Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/Gigo.git
cd Gigo/Gigo_Dapp/Gigo

# Navigate to projects directory
cd projects
```

---

## 2️⃣ Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env  # or create manually with the template below
```

### Frontend Environment Variables (`.env`)

```env
# Algorand Configuration
VITE_RIDE_APP_ID=763288139
VITE_BACKEND_URL=...

# Optional: Override with local backend
# VITE_BACKEND_URL=http://localhost:3001
```

### Run Frontend

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Frontend will be available at `http://localhost:5173`

---

## 3️⃣ Backend Setup

```bash
# Navigate to backend directory
cd ../backend

# Install dependencies
npm install

# Create .env file
cp .env  # or create manually with the template below
```

### Backend Environment Variables (`.env`)

```env
# Server Configuration
PORT=3001

# Algorand Configuration
ALGORAND_NODE=https://testnet-api.algonode.cloud
RIDE_APP_ID=763288139
PLATFORM_WALLET=YOUR_PLATFORM_WALLET_ADDRESS

# AI & Route Optimization
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxx
ORS_API_KEY=eyrfhvcddfvgvdecv.............

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gigodapp

# IPFS Storage (Pinata)
PINATA_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
PINATA_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PINATA_JWT=egfvgnhgfJhbG...

# GIGC Token Configuration
TREASURY_ADDRESS=YOUR_TREASURY_WALLET_ADDRESS
TREASURY_MNEMONIC="word1 word2 ... word25"  # 25-word mnemonic
CONVERSION_RATIO=100
GIGC_ASSET_ID=763011769
```

### Run Backend

```bash
# Development server (with auto-reload)
npm run dev

# Production server
npm start
```

Backend API will be available at `http://localhost:3001`

---

## 4️⃣ Smart Contracts Setup

```bash
# Navigate to contracts directory
cd ../contracts

# Install dependencies
pip install -r requirements.txt
# or
poetry install
```

### Smart Contracts Environment Variables (`.env`)

```env
# TestNet Algod Configuration
ALGOD_SERVER=https://testnet-api.4160.nodely.dev
ALGOD_PORT=
ALGOD_TOKEN=

# TestNet Indexer Configuration
INDEXER_SERVER=https://testnet-idx.4160.nodely.dev
INDEXER_PORT=
INDEXER_TOKEN=

# Deployer Account (25-word mnemonic)
DEPLOYER_MNEMONIC="word1 word2 word3 ... word25"
```

### Deploy Smart Contracts

```bash
# Deploy to TestNet
python -m smart_contracts

# View deployment artifacts
ls artifacts/
```

---

## 5️⃣ Environment Variables Summary

| Component | Variable | Example Value |
|-----------|----------|---------------|
| **Frontend** | `VITE_RIDE_APP_ID` | `763288139` |
| **Frontend** | `VITE_BACKEND_URL` | `http://localhost:3001` |
| **Backend** | `PORT` | `3001` |
| **Backend** | `MONGODB_URI` | `mongodb+srv://...` |
| **Backend** | `GROQ_API_KEY` | `gffrcff_...` |
| **Backend** | `PINATA_JWT` | `eyfvgfrfgh...` |
| **Backend** | `RIDE_APP_ID` | `763288139` |
| **Contracts** | `DEPLOYER_MNEMONIC` | `word1 word2 ...` |

---

## 🔗 Important Addresses & IDs

| Name | Value | Type |
|------|-------|------|
| **GIGC ASA ID** | `763011769` | Asset |
| **Ride App ID** | `763288139` | Smart Contract |
| **Platform Wallet** | `YOUR_PLATFORM_WALLET_ADDRESS` | Account |
| **Network** | `Algorand TestNet` | Blockchain |

---

## ✅ Verification Checklist

After setup, verify everything is working:

- [ ] Frontend starts without errors: `npm run dev`
- [ ] Backend server running: `http://localhost:3001`
- [ ] MongoDB connection successful
- [ ] Wallet connected in frontend
- [ ] Smart contracts deployed
- [ ] IPFS (Pinata) accessible

---

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Find process on port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Environment Variables Not Loading
- Verify `.env` file is in the correct directory
- Restart the development server after creating `.env`
- Check for typos in variable names

---

## 🧪 Running in Development

### Terminal 1: Backend
```bash
cd projects/backend
npm run dev
```

### Terminal 2: Frontend
```bash
cd projects/frontend
npm run dev
```

### Terminal 3: Smart Contracts (optional for testing)
```bash
cd projects/contracts
python -m smart_contracts
```

---

# 🪙 GIGC ASA Information

| Property   | Value       |
| ---------- | ----------- |
| Asset Name | Gigo Credit |
| Ticker     | GIGC        |
| ASA ID     | 763011769   |

---
# 🪙 GIGC ASA Information

| Property   | Value       |
| ---------- | ----------- |
| Asset Name | Gigo Credit |
| Ticker     | GIGC        |
| ASA ID     | 763011769   |

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
