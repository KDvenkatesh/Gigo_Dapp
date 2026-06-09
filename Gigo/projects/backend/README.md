# ⚙️ Gigo Backend (The "Nerve Center")

Welcome to the engine room! While the Blockchain handles the money and the Frontend handles the visuals, the **Backend** handles all the fast-paced, real-time logic that makes a ride-sharing app actually work.

Our backend is a fast, lightweight **Node.js (Express)** server hooked up to a **MongoDB** database.

## 🧠 What does the Backend actually do?

The blockchain is amazing for secure payments, but it's too slow and expensive to store things like "The driver is currently at coordinates 0.312, 32.581". The backend handles everything *off-chain*.

### 1. 📍 Real-Time Ride Matching & GPS
When a customer requests a ride, the backend calculates the exact Haversine distance (in kilometers), calculates the required GIGC fare, and broadcasts the ride to nearby drivers. It constantly tracks the driver's GPS coordinates as they move.

### 2. 🤖 AI Mobility & Dynamic Surge Pricing
We've integrated high-speed AI (via Groq) to analyze ride requests. Alongside AI, the backend uses real-time API integrations for dynamic pricing:
- **Weather Surge:** Pulls data from OpenWeather API to apply surge multipliers during rain or bad weather.
- **Traffic Surge:** Uses OpenRouteService (ORS) to calculate expected route delays and adjust fare multipliers accordingly upfront.
- **AI Hotspots:** Predicts demand and suggests safer or more optimal pickup hotspots for the customer.

### 3. ⏱️ The "Auto-Scanner" & Treasury Subsidy (Smart Payouts)
The backend runs a background process that constantly monitors all active rides.
- **If the driver reaches the destination:** The backend acts as the "Platform Admin" and sends an automatic trigger to the Algorand Smart Contract to release the locked money to the driver.
- **Treasury Subsidy Model:** If unexpected delays occur (like a customer taking too long to come outside, resulting in Wait Time Fees), the smart contract releases the initial escrow, and the backend's "Treasury Wallet" automatically subsidizes the driver for the extra wait time using an Atomic Transaction!
- **If the driver takes too long or cancels:** The backend triggers the smart contract to refund the customer's money automatically. 

### 4. 🗃️ Decentralized Storage (IPFS via Pinata)
When a driver uploads their sensitive ID documents for verification, we don't store the images on a centralized server where they could be hacked. Instead, the backend uploads them to the **IPFS (InterPlanetary File System)** using Pinata. This generates a unique cryptographic hash (CID) for the image, ensuring the files can never be tampered with.

## 🛡️ Security
The backend holds the highly secure "Treasury Wallet" mnemonic in its `.env` file. This treasury is used to automatically mint and distribute GIGC tokens when users "Top Up" their accounts using standard ALGO.
