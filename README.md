# 🚖 Gigo DApp — Decentralized Ride-Sharing

Gigo is a premium, decentralized ride-sharing platform built on the **Algorand Blockchain**. This repository contains the frontend and backend infrastructure for a high-performance Web3 transportation network.

## 🚀 Recent Architecture Upgrades

We have transitioned from a local-client storage model to a **Hybrid Decentralized Architecture**:

### 1. IPFS Integration (Pinata)
All critical media and metadata are now stored on **IPFS** via Pinata, ensuring that driver documents and customer profiles are globally available and immutable.
- **Driver Documents**: Licenses, insurance, and profile photos are pinned to IPFS.
- **Customer Profiles**: Profile photos are now decentralized and linked to wallet addresses.
- **Ride Metadata**: Rich ride data (pickup/drop labels, vehicle types) are stored as JSON on IPFS, making them globally accessible to riders.

### 2. Smart Backend Indexing
A dedicated Express backend serves as a high-speed indexing layer for IPFS CIDs.
- **Wallet-to-CID Mapping**: Securely maps user wallets to their latest metadata on IPFS.
- **Real-time Synchronization**: Ensures ride data is synced across different devices and sessions.
- **Rate Limit Optimization**: Implements chunked fetching and retry logic for Algorand application boxes to maintain UI stability.

### 3. PWA (Progressive Web App)
Gigo is fully PWA-compatible, allowing users to install it on their mobile devices for a native app-like experience.
- **Network-First Strategy**: Updated Service Worker logic to ensure users always see the latest version while maintaining offline resilience.
- **Automated Prompts**: Intelligent installation triggers for a seamless onboarding flow.

## 🛠 Technology Stack

- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Blockchain**: Algorand (using `algokit` and `use-wallet`)
- **Storage**: IPFS (Pinata)
- **Backend**: Node.js + Express
- **Payments**: x402 (Standardized AI/API micro-payments)

## 📦 Project Structure

- `projects/frontend`: React application containing the Driver, Customer, and Admin dashboards.
- `projects/backend`: Express API for AI fare prediction, route optimization, and IPFS indexing.

## 🔧 Environment Setup

### Frontend (.env)
```env
VITE_BACKEND_URL=https://your-backend.onrender.com
VITE_RIDE_APP_ID=your_algorand_app_id
```

### Backend (.env)
```env
PINATA_JWT=your_pinata_jwt
GROQ_API_KEY=your_ai_key
ALGO_SERVER=https://testnet-api.algonode.cloud
ALGO_PORT=443
```

---

— Shaik Ishaq & K Dhanu
