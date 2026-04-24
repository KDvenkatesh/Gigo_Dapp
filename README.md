# Gigo — Ride-Sharing on the Blockchain

Hey there 👋 — welcome to Gigo, my take on what ride-sharing should actually look like. No middlemen, no delayed payouts, no black-box algorithms deciding what drivers earn. Just riders, drivers, and a smart contract keeping everyone honest.

---

## Why I Built This

I got tired of seeing how traditional ride-sharing platforms work. Drivers wait days for earnings. Riders have no idea where their money actually goes. A faceless company sits in the middle taking a massive cut and calling it "service fees."

Gigo is my answer to that. It runs on **Algorand** — a blockchain that's genuinely fast and cheap enough for everyday transactions — and puts the financial relationship directly between the rider and the driver.

---

## What It Can Do

### Core Ride Flow
A rider opens the app, picks a pickup and drop location, and books a ride. Their payment locks into a **smart contract escrow** — the driver doesn't get it, the app doesn't get it, it just sits there safely until the ride is done. The driver accepts, picks up the rider (after a quick OTP verification), completes the trip, and the funds release automatically. That's it.

### AI Features
I added an AI layer (powered by **Groq**) that actually makes the experience smarter:

- **Fare Prediction** — Before booking, the app analyzes current demand, distance, and vehicle type to suggest a fair price.
- **Smart Routing** — The driver's map uses AI + OpenRouteService to find traffic-aware routes, not just the shortest line on a map.
- **Earnings Insights** — Drivers get a personal breakdown of their week: total earned, distance covered, best-performing areas, and strategy tips.

### NFT Ride Passes
Regular riders can subscribe to a pass (Silver, Gold, or Platinum). These are actual NFTs on Algorand, not just loyalty points. Hold one and you unlock:
- Daily free rides (1 to 3, depending on tier)
- Fare discounts up to 40%, applied automatically at checkout

---

## How It's Built

```
Gigo/
├── projects/
│   ├── frontend/     # React + TypeScript + Tailwind CSS
│   ├── backend/      # Node.js + Express + Groq AI
│   └── contracts/    # Algorand Smart Contracts (Algopy)
```

**Frontend:** Built with React, TypeScript, and Tailwind. Animations with Framer Motion to keep things feeling alive.

**Backend:** A lightweight Express server handling the AI calls (fare prediction, smart routing, earnings analysis). Hosted on Render.

**Smart Contracts:** Written with Algopy (Python-based Algorand contract framework). Handles escrow logic, OTP verification, and payment release.

---

## Running It Locally

You'll need Node.js v18+, a Pera Wallet on Algorand Testnet, a Groq API key, and an ORS API key.

```bash
# Clone the repo
git clone https://github.com/KDvenkatesh/Gigo_Dapp.git
cd Gigo_Dapp

# Start the backend
cd Gigo/projects/backend
npm install
cp .env.example .env  # Add your API keys here
npm run dev

# Start the frontend (new terminal)
cd Gigo/projects/frontend
npm install
cp .env.example .env
npm run dev
```

---

## Links

- 📺 **Demo Video:** [Watch on YouTube](https://youtu.be/IwIqgCa2mk8)
- 🚀 **Live Backend API:** [gigo-dapp.onrender.com](https://gigo-dapp.onrender.com)

---

## A Note on Algorand

I chose Algorand specifically because other chains would make this impractical — gas fees alone would eat into every transaction. Algorand's fees are fractions of a cent, finality is near-instant (under 4 seconds), and the developer tooling is solid. For a payments-heavy app like this, it was the only choice that made sense.

---

Made with a lot of late nights and a belief that decentralization should actually benefit the people using the app, not just the people building it.

— Shaik Ishaq & K Dhanu
