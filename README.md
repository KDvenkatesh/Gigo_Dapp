# 🚖 Gigo — Decentralized Ride-Sharing

Gigo is our take on a modern, decentralized ride-sharing platform. We built it on the **Algorand Blockchain** to fix the trust and payment issues in traditional ride apps, while keeping the speed and feel of a premium mobile experience.

---

## ⚡ What makes Gigo different?

- **Real-time Sync**: We use a hybrid model where Algorand handles the money and MongoDB handles the live ride feed. This means zero lag for drivers and total security for customers.
- **Smart Payouts (GIGC)**: We created our own currency (GIGC) so payments are instant and low-fee. Money is locked in escrow as soon as you book and only moves when the ride is actually done.
- **AI at the Core**: We've integrated Grok AI to help you out. It predicts price changes (so you know when to book) and gives drivers hotspots to find more passengers.
- **Decentralized Profiles**: Your documents and photos aren't stored on a private server—they're pinned to **IPFS**, meaning you truly own your data.

---

## 🛠 What's under the hood?

- **Frontend**: A slick, fast PWA built with React and Framer Motion. It works like a native app on your phone.
- **Backend**: A Node.js API that acts as the "brain," connecting the AI models, MongoDB, and the blockchain.
- **Smart Contracts**: Secure Puya-based contracts that manage the escrow and payment releases.

---

## 📂 How it's organized

- `/projects/frontend`: Everything you see on screen (Driver & Customer dashboards).
- `/projects/backend`: The logic layer (AI, Sync, and Data).
- `/projects/contracts`: The "bank" layer (Blockchain security).

---

## ⚙️ Quick Setup

If you're running this yourself, you'll need a few things in your `.env` files:

### For the Web App (`/frontend/.env`)
- `VITE_BACKEND_URL`: Your backend address (Render/Local).
- `VITE_RIDE_APP_ID`: The ID of our smart contract.

### For the Brain (`/backend/.env`)
- `MONGODB_URI`: Your database link.
- `GROQ_API_KEY`: For the Grok AI predictions.
- `PINATA_JWT`: To talk to IPFS.

---

## 🌍 Where to find us

- **Frontend**: Usually hosted on Vercel.
- **Backend**: Usually running on Render.
- **Blockchain**: Running on Algorand TestNet.

> [!TIP]
> **A quick note on the AI**: We've updated the Grok analysis to use Indian Standard Time (IST). It now correctly identifies "Evening Rush" vs "Lunch Break" regardless of where the server is hosted.

---

### Built by
**Shaik Ishaq** & **K Dhanu** 
*Pushing the limits of Web3 mobility.*
