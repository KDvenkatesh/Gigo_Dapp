# 🚖 Gigo DApp — Decentralized Ride-Sharing

Gigo is a premium, decentralized ride-sharing platform built on the **Algorand Blockchain**. It combines high-speed Web3 infrastructure with AI-powered insights to provide a seamless, secure, and modern transportation experience.

---

## 🚀 Core Features

### 1. Hybrid "Lean On-Chain" Architecture
Gigo uses a sophisticated hybrid model to ensure the best performance for mobile users:
- **Blockchain (Algorand)**: Handles immutable financial transactions, GIGC (ASA) escrows, and ride state validation.
- **Off-Chain (MongoDB + Express)**: Handles real-time ride synchronization, live driver feeds, and metadata indexing for ultra-fast UI updates.
- **IPFS (Pinata)**: Decentralized storage for driver documents, customer profile photos, and rich ride metadata.

### 2. AI-Powered Intelligence (Grok 3.0)
Integrated with **Grok AI (via Groq Cloud)** to provide real-time strategic data:
- **Price Prediction**: Analyzes local traffic, time of day (IST), and historical demand to predict fare changes.
- **Earnings Insights**: Helps drivers optimize their routes and identify demand hotspots using algorithmic analysis.
- **Traffic Analysis**: Real-time traffic condition estimation between pickup and destination.

### 3. Web3 Payments & Escrow
- **Gigo Credit (GIGC)**: A custom Algorand Standard Asset (ASA) used for all payments.
- **Secure Escrow**: Funds are locked the moment a ride is booked and only released when the customer confirms the destination via OTP.
- **x402 Micropayments**: Integrated x402 standard for API-level micro-payments for AI services.

---

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion (Animations), Lucide (Icons).
- **Blockchain**: Algorand (PyTeal/Puya Smart Contracts, use-wallet-react).
- **Backend**: Node.js, Express, Mongoose (MongoDB), Groq SDK.
- **Storage**: IPFS (Pinata SDK) for decentralized document management.
- **PWA**: Fully installable mobile experience with custom Service Worker logic.

---

## 📂 Project Structure

```bash
├── projects/
│   ├── frontend/        # React PWA (Driver & Customer Dashboards)
│   ├── backend/         # Express API (AI, MongoDB Sync, x402 Middleware)
│   └── contracts/       # Algorand Smart Contracts (RideContract)
```

---

## 🔧 Environment Configuration

To run Gigo locally or in production, you need to configure the following environment variables:

### Frontend (`projects/frontend/.env`)
- `VITE_BACKEND_URL`: URL of your running backend (e.g., `https://gigo-backend.onrender.com`).
- `VITE_RIDE_APP_ID`: The ID of the deployed Algorand RideContract.

### Backend (`projects/backend/.env`)
- `MONGODB_URI`: Your MongoDB connection string.
- `GROQ_API_KEY`: Your Groq Cloud API Key (Llama 3.3 / Grok).
- `PINATA_JWT`: Your Pinata IPFS access token.
- `ALGO_SERVER`: `https://testnet-api.algonode.cloud`

---

## 🌐 Production Deployment

- **Frontend**: Optimized for **Vercel**. Ensure the environment variables are set in the Vercel dashboard.
- **Backend**: Optimized for **Render**. Ensure the backend's CORS settings allow your Vercel domain.
- **Database**: Use **MongoDB Atlas** for a managed production database.

> [!NOTE]
> **Time Analysis Correction (v1.2)**
> We recently resolved an issue where the AI analysis (Grok) misidentified evening hours as lunch breaks. The system now explicitly passes human-readable Indian Standard Time (IST) strings to the AI models to ensure accurate context analysis regardless of server timezone.

---

## 👥 Authors
Developed with ❤️ by **Shaik Ishaq** & **K Dhanu**.
