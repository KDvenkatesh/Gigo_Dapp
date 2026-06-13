# GigGo System Architecture

The GigGo ecosystem is composed of a decentralized DApp frontend, a backend REST API for indexing and off-chain data, smart contracts on the Algorand blockchain for escrow and dispute resolution, and IPFS for decentralized metadata storage.

## Architecture Flowchart

```mermaid
flowchart TD
    %% Define Styles
    classDef actor fill:#E5E7EB,stroke:#4B5563,stroke-width:2px,color:#111827
    classDef frontend fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    classDef backend fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    classDef blockchain fill:#F59E0B,stroke:#B45309,stroke-width:2px,color:#fff
    classDef storage fill:#8B5CF6,stroke:#5B21B6,stroke-width:2px,color:#fff

    %% Actors
    subgraph Users [System Actors]
        Customer((👤 Customer)):::actor
        Driver((🚗 Driver)):::actor
        Admin((👑 Admin)):::actor
    end

    %% Client Layer
    subgraph Client [Client Interfaces]
        CApp(Customer DApp):::frontend
        DApp(Driver DApp):::frontend
        AApp(Admin Dashboard):::frontend
        W(Web3 Wallet):::frontend
    end

    %% Server Layer
    subgraph Server [Backend Infrastructure]
        API(REST API Server):::backend
        AI(AI Surge & Weather Engine):::backend
        DB[(MongoDB Database)]:::backend
    end

    %% Web3 Layer
    subgraph Web3 [Decentralized Network]
        SC(Algorand Smart Contracts\nEscrow & Settlement):::blockchain
        IPFS(IPFS Storage):::storage
    end

    %% Customer Flow
    Customer -->|Books Ride| CApp
    Customer -->|Approves Escrow| W
    CApp -->|Request Ride & Price| API
    CApp <-->|Sign Escrow TXN| W
    CApp -->|Confirm OTP| DApp

    %% Driver Flow
    Driver -->|Toggles Online| DApp
    Driver -->|Accepts Ride| DApp
    DApp -->|Fetch Available Rides| API
    DApp -->|Submit OTP| API
    DApp <-->|Sign Payout Claim| W

    %% Admin Flow
    Admin -->|Review KYC| AApp
    Admin -->|Resolve Disputes| AApp
    AApp -->|Update Driver Status| API
    AApp -->|Trigger Force Refunds| SC

    %% Backend Interactions
    API <-->|Store Ride State| DB
    API <-->|Fetch Real-Time Multipliers| AI
    API -->|Submit Metadata/Receipts| IPFS
    
    %% Blockchain Interactions
    W -->|Submit Signed TXN| SC
    API -->|Monitor On-chain Events| SC
    
    %% Legend Styling
    linkStyle default stroke:#9CA3AF,stroke-width:2px
```

### Components

- **GigGo Web DApp**: Built with React, Vite, and Tailwind CSS. It handles user authentication, ride requests, driver matching, and wallet connections.
- **REST API**: Built with Node.js and Express. It serves as an indexer for rides, calculates dynamic pricing (surge, weather), handles off-chain coordination (e.g. OTP generation), and logs presence evidence.
- **Algorand Blockchain**: The core of trust. Smart contracts handle ride escrows, locking customer funds upon request, and releasing them to drivers upon successful completion.
- **IPFS**: Used for decentralized storage of driver documents (licenses, ID) and immutable ride receipts.
