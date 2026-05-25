# 🖥️ Gigo Frontend (The "Face" of Gigo)

Welcome to the visual heart of Gigo! If you're wondering how users interact with our decentralized ride-sharing platform, you're in the right place. 

Our frontend is built as a **Progressive Web App (PWA)** using **React, Vite, and TailwindCSS**. This means it looks and feels like a native mobile app on your phone, but runs smoothly directly in your browser without needing an app store download.

## 🎭 The Three Portals

The frontend magically morphs to serve three entirely different types of users:

### 1. 🚶‍♂️ Customer Portal
This is where the magic starts for riders.
- **Interactive Map:** Customers see their live location and can set their pickup/dropoff points.
- **Book Rides:** They get real-time price quotes (in GIGC tokens) based on distance.
- **Wallet Connection:** It securely connects to the **Pera Wallet** app on their phone so they can approve payments.
- **Top-Up & Passes:** Customers can use our self-service system to convert standard ALGO into our native GIGC tokens, or subscribe to premium NFT passes (Silver, Gold, Platinum) for discounted rides!

### 2. 🛵 Driver Portal
This is the command center for boda boda drivers.
- **Receive Requests:** Drivers instantly see incoming ride requests in their area.
- **Navigation:** It guides them to the pickup point and tracks their progress to the dropoff.
- **Instant Payouts:** Once they hit the dropoff point, the frontend talks to the backend, which triggers the smart contract to pay the driver instantly!

### 3. 🛡️ Admin Portal
The control room for the Gigo operations team.
- **KYC Verification:** When a new driver signs up, they upload their license and national ID. The Admin portal pulls these documents from the decentralized **IPFS (InterPlanetary File System)** network so a human can approve or reject the driver.

## 🔌 How it connects to the Blockchain
We use `@txnlab/use-wallet-react` and standard Algorand SDKs to connect the app to the blockchain. When you book a ride, the frontend constructs an "Escrow Transaction" and sends a prompt to your mobile phone's Pera Wallet asking you to safely sign the transaction. We never hold your private keys!
