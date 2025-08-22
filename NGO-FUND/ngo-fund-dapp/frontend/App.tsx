import React, { useState, useEffect } from 'react';

// --- CONFIGURATION ---
// This must be your deployed contract address
const CHARITY_ADDRESS = '0xbc6672e193635582a91fa845509987cd628c5f2a9a12f02440fa47b861139e58'; 
const MODULE_ADDRESS = '0xbc6672e193635582a91fa845509987cd628c5f2a9a12f02440fa47b861139e58'; 
const MODULE_NAME = 'charity_tracker';
const APTOS_NODE_URL = 'https://fullnode.testnet.aptoslabs.com/v1';

// --- TYPE DEFINITIONS ---
interface AptosWallet {
  connect: () => Promise<any>;
  disconnect: () => Promise<void>;
  account: () => Promise<{ address: string; publicKey: string }>;
  signAndSubmitTransaction: (transaction: any) => Promise<{ hash: string }>;
}

type WalletState = {
  address: string | null;
  isConnected: boolean;
};

type Expense = {
    purpose: string;
    amount: number;
    timestamp: string;
};

// --- API HELPER TO WAIT FOR TRANSACTION ---
const waitForTransaction = async (hash: string) => {
    for (let i = 0; i < 30; i++) {
        try {
            const response = await fetch(`${APTOS_NODE_URL}/transactions/by_hash/${hash}`);
            if (response.status === 200) {
                const data = await response.json();
                if (data.success) return data;
                throw new Error(`Transaction failed: ${data.vm_status}`);
            }
        } catch (e) { throw e; }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Transaction timed out.');
};

// --- UI COMPONENTS ---

const Header = ({ balance, totalRaised }) => (
    <header className="bg-white shadow-md p-6 rounded-lg text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Charity Donation Tracker</h1>
        <p className="text-gray-600 mt-2">Transparently funding community projects.</p>
        <div className="mt-4">
            <p className="text-sm font-mono text-gray-500">Charity Address: {CHARITY_ADDRESS}</p>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-lg font-semibold text-gray-700">Current Donation Balance</p>
                <p className="text-5xl font-bold text-blue-600">
                    {(balance / 10**8).toFixed(4)} <span className="text-3xl">APT</span>
                </p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl">
                <p className="text-lg font-semibold text-gray-700">Total Donations Received</p>
                <p className="text-5xl font-bold text-green-600">
                    {(totalRaised / 10**8).toFixed(4)} <span className="text-3xl">APT</span>
                </p>
            </div>
        </div>
    </header>
);

const DonationCard = ({ onDonate, isLoading }) => {
    const [amount, setAmount] = useState('');

    const handleDonate = () => {
        const amountInOcta = parseFloat(amount) * 10**8;
        if (isNaN(amountInOcta) || amountInOcta <= 0) {
            alert("Please enter a valid donation amount.");
            return;
        }
        onDonate(amountInOcta.toString());
    };

    return (
        <div className="bg-white shadow-md p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Make a Donation</h2>
            <div className="flex flex-col space-y-4">
                <input
                    type="number"
                    placeholder="Enter APT amount (e.g., 1.5)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 text-base text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={handleDonate}
                    disabled={isLoading}
                    className="w-full px-6 py-3 text-lg font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                    {isLoading ? 'Processing...' : 'Donate APT'}
                </button>
            </div>
        </div>
    );
};

// NEW: Component to display the expense tracker
const ExpenseTracker = ({ expenses }) => (
    <div className="bg-white shadow-md p-8 rounded-lg">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Expense Tracker</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
            {expenses.length === 0 ? (
                <p className="text-gray-500">No expenses recorded yet.</p>
            ) : (
                expenses.map((expense, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                        <div>
                            <p className="font-semibold text-gray-700">{expense.purpose}</p>
                            <p className="text-sm text-gray-500">{expense.timestamp}</p>
                        </div>
                        <p className="font-bold text-red-600">- {(expense.amount / 10**8).toFixed(4)} APT</p>
                    </div>
                ))
            )}
        </div>
    </div>
);


// --- MAIN APP COMPONENT ---

export default function App() {
    const [wallet, setWallet] = useState<WalletState>({ address: null, isConnected: false });
    const [isLoading, setIsLoading] = useState(false);
    const [balance, setBalance] = useState(0);
    const [totalRaised, setTotalRaised] = useState(0);
    // NEW: State to store expenses
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const getAptosWallet = (): AptosWallet | undefined => {
        if ('aptos' in window) return window.aptos as AptosWallet;
    };

    const connectWallet = async () => {
        const aptosWallet = getAptosWallet();
        if (!aptosWallet) {
            alert("Petra Wallet not found. Please install it.");
            return;
        }
        try {
            await aptosWallet.connect();
            const account = await aptosWallet.account();
            setWallet({ address: account.address, isConnected: true });
        } catch (error) {
            console.error(error);
        }
    };
    
    const fetchCharityData = async () => {
        try {
            const payload = {
                function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_charity_stats`,
                type_arguments: [],
                arguments: [CHARITY_ADDRESS],
            };
            const response = await fetch(`${APTOS_NODE_URL}/view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error("Failed to fetch charity data");
            const data = await response.json();
            setBalance(parseInt(data[0], 10));
            setTotalRaised(parseInt(data[1], 10));
        } catch (error) {
            console.error("Could not fetch charity data:", error);
        }
    };
    
    // NEW: Function to fetch expense events from the blockchain
    const fetchExpenses = async () => {
        try {
            const resourceType = `${MODULE_ADDRESS}::charity_tracker::Registry`;
            const eventsUrl = `${APTOS_NODE_URL}/accounts/${MODULE_ADDRESS}/resource/${resourceType}`;
            const response = await fetch(eventsUrl);
            if (!response.ok) return;
            
            const resource = await response.json();
            const eventsHandle = resource.data.expense_events.guid.id.addr;
            const creationNum = resource.data.expense_events.guid.id.creation_num;

            const eventsDataUrl = `${APTOS_NODE_URL}/accounts/${eventsHandle}/events/${creationNum}`;
            const eventsResponse = await fetch(eventsDataUrl);
            const events = await eventsResponse.json();

            const formattedExpenses = events.map(event => ({
                purpose: event.data.purpose,
                amount: parseInt(event.data.expense_amount, 10),
                timestamp: new Date(parseInt(event.version, 10) / 1000).toLocaleString(),
            })).reverse(); // Show most recent first
            
            setExpenses(formattedExpenses);
            
        } catch (error) {
            console.error("Could not fetch expenses:", error);
        }
    };

    const handleDonate = async (amount: string) => {
        const aptosWallet = getAptosWallet();
        if (!wallet.isConnected || !aptosWallet) {
            alert("Please connect your wallet first.");
            return;
        }
        
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::donate_with_signer`,
            type_arguments: [],
            arguments: [CHARITY_ADDRESS, amount],
        };

        setIsLoading(true);
        try {
            const tx = await aptosWallet.signAndSubmitTransaction(payload);
            await waitForTransaction(tx.hash);
            
            const amountInt = parseInt(amount, 10);
            setBalance(prev => prev + amountInt);
            setTotalRaised(prev => prev + amountInt);
            
            alert("Donation successful!");
            await fetchCharityData();
        } catch (error) {
            console.error(error);
            alert(`Donation failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        const fetchData = () => {
            fetchCharityData();
            fetchExpenses();
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!wallet.isConnected) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Welcome to the Charity Portal</h1>
                    <button
                        onClick={connectWallet}
                        className="px-8 py-4 text-xl font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        Connect Petra Wallet
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <div className="container mx-auto max-w-2xl px-4">
                <Header balance={balance} totalRaised={totalRaised} />
                <main>
                    <DonationCard onDonate={handleDonate} isLoading={isLoading} />
                    {/* NEW: Added the ExpenseTracker component */}
                    <ExpenseTracker expenses={expenses} />
                </main>
            </div>
        </div>
    );
}