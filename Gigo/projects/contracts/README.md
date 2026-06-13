# 📜 Gigo Smart Contracts (The "Trust" Layer)

Welcome to the brains behind Gigo's secure payments! If you're not a blockchain developer, don't worry—here is a simple, human-readable breakdown of how our Algorand smart contracts work.

### What is a Smart Contract?
Think of a smart contract as an **unbreakable, automated digital vending machine**. Instead of trusting a human or a bank to hold your money and pay the driver, you trust this openly visible computer code. It follows the rules exactly as written, and nobody can cheat it.

## 🚖 The Ride Escrow System (How Payments Work)

Gigo uses a custom Algorand smart contract (written in Python using Algopy) called the **RideContract**. Its main job is to act as a **secure escrow** (a neutral middleman) during a ride.

Here is the step-by-step journey of your money:

1. **Booking (Locking Funds):** 
   When a passenger books a boda boda, they don't pay the driver directly yet. Instead, their Pera Wallet sends the exact fare in **GIGC tokens** to the Smart Contract. The contract securely "locks" these tokens in a digital vault tied to that specific Ride ID.

2. **The Ride:**
   While the passenger is enjoying the ride, the GIGC tokens sit safely in the vault. The driver knows the money is guaranteed because it's locked on the blockchain, and the passenger knows the driver can't take the money until they reach their destination.

3. **Payout (Releasing Funds):**
   Once the backend detects (via GPS) that the driver has dropped the passenger off at the destination, it sends an "unlock" signal to the smart contract. The contract immediately releases the locked GIGC tokens directly into the driver's wallet. Boom! Instant payout, no cash disputes.

4. **Refunds & Cancellations (What if things go wrong?):**
   If a driver never shows up, or the ride is cancelled before pickup, the passenger (or the automated backend system) can call the `cancel_refund` function. The smart contract instantly unlocks the vault and sends the GIGC tokens back to the passenger.

### 🏦 The Treasury Subsidy System (Handling Post-Ride Fees)
Sometimes a ride changes dynamically *after* the customer has locked their escrow. For example:
- The customer takes 5 minutes to come outside, incurring a **Wait Time Fee**.
- The driver hits unexpected traffic that wasn't predicted.
Because the Smart Contract cannot distribute *more* money than what the customer initially escrowed, the backend utilizes an **Atomic Transaction Group** to solve this. 
During `release_payment`, the contract releases the locked escrow to the driver, and the **Platform Treasury** seamlessly transfers an additional subsidy to cover the extra Wait or Traffic fees in the exact same millisecond. The driver receives their full combined payout instantly!

### Why use Algorand instead of Cash or Mobile Money?
- **No Cash Disputes:** Drivers don't need to carry change, and passengers don't need to argue over the price.
- **Instant Payouts:** Unlike Uber or Bolt where drivers wait a week to get paid, Gigo drivers get their GIGC the *exact second* the ride ends.
- **Zero Platform Fees on Rides:** Because the smart contract handles the money automatically, we don't need to charge a 25% commission just to process payments.

### For Developers 👨‍💻
This project is built using **AlgoKit** and **Algorand Python (Puya)**.
- `contract.py`: Contains the actual on-chain logic (`initialize_escrow`, `accept_ride`, `release_payment`, `cancel_refund`).
- `deploy_config.py`: Handles the compilation and deployment to the Algorand TestNet.
