# 🚀 Gigo – Decentralized Ride-Sharing DApp (Algorand)

Gigo is a decentralized ride-sharing platform built on the Algorand blockchain that enables secure, trustless, and transparent ride transactions without intermediaries.

---

## 📌 Problem Statement

Traditional ride-sharing platforms suffer from:
- ❌ Trust issues between users  
- ❌ Delayed payments  
- ❌ High commissions & middlemen  

---

## 💡 Solution

Gigo solves these problems using **smart contract-based escrow**:

- Customer deposits payment into smart contract  
- Driver completes the ride  
- Payment is automatically released after verification  

✔ Secure  
✔ Fast  
✔ Trustless  

---

## 🔥 Features

- 🔐 Smart Contract Escrow Payments  
- 🚗 Customer & Driver Role System  
- 📍 Ride Booking & Tracking  
- 🔑 OTP-based Ride Verification  
- ⚡ Instant Payment Settlement  
- 💸 Low Transaction Fees (Algorand)  

---

## 🧠 How It Works

1. User selects role (Customer / Driver)  
2. Connects wallet (Pera Wallet)  
3. Customer books ride (pickup/drop)  
4. Payment locked in escrow  
5. Driver accepts ride  
6. OTP verification  
7. Ride completion  
8. Payment released to driver  

---

## 🏗 System Architecture

- **Frontend**: React.js  
- **Blockchain**: Algorand  
- **Smart Contracts**: PyTeal / Algopy  
- **Wallet Integration**: Pera Wallet  
- **Backend (optional)**: OTP verification & APIs  

---

## ⚙️ Smart Contract Logic

- `create_ride()` → Initializes ride  
- `accept_ride()` → Assigns driver  
- `start_ride()` → Locks funds in escrow  
- `verify_otp()` → Secures ride start  
- `complete_ride()` → Releases payment  

---

## 🚀 Future Enhancements

- 🤖 AI-based ride matching & fare prediction  
- 🎟 NFT-based ride passes (Weekly / Monthly)  
- 📊 Driver analytics dashboard  
- 🌐 Multi-chain integration  

---

## 💡 Why Algorand?

- ⚡ Instant finality  
- 💸 Near-zero transaction fees  
- 🔐 High security  
- 📈 Highly scalable  

---

## 🛠 Installation & Setup

### 1. Clone the repo
```bash
git clone https://github.com/DKvenkatesh/gigo-dapp.git
cd gigo-dapp

install :
npm install

Run :
npm run dev

Deploy smart contract
Configure Algorand testnet
Deploy using PyTeal / Algopy.

📸 Demo : https://youtu.be/IwIqgCa2mk8
🚀 Live Backend : https://gigo-dapp.onrender.com
