import express from 'express';
import { Customer } from '../models/Customer';
import algosdk from 'algosdk';

const router = express.Router();

const ALGORAND_NODE = process.env.ALGORAND_NODE || 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2('', ALGORAND_NODE, '');
const TREASURY_MNEMONIC = process.env.TREASURY_MNEMONIC || 'magic mushroom lazy turtle erode matter aspect morning butter join where inherit step guitar skull skill sentence family unveil fortune true bless collect able hazard';
const GIGC_ASSET_ID = Number(process.env.GIGC_ASSET_ID || '763011769');

router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    let customer = await Customer.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!customer) {
      // If customer doesn't exist, create an empty one
      customer = await Customer.create({ walletAddress: walletAddress.toLowerCase() });
    }
    
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch customer data' });
  }
});

router.post('/clear-debt', async (req, res) => {
  try {
    const { walletAddress, txId } = req.body;
    
    if (!walletAddress || !txId) {
      return res.status(400).json({ error: 'Missing walletAddress or txId' });
    }

    const customer = await Customer.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!customer || !customer.outstandingDebt || customer.outstandingDebt <= 0) {
      return res.status(400).json({ error: 'No outstanding debt found for this customer' });
    }

    // Verify the transaction on the blockchain
    const txInfo = await algodClient.pendingTransactionInformation(txId).do().catch(async () => {
       // If it's not pending, check confirmed transactions
       try {
           const indexerClient = new algosdk.Indexer('', 'https://testnet-idx.algonode.cloud', '');
           const tx = await indexerClient.lookupTransactionByID(txId).do();
           return tx.transaction;
       } catch (e) {
           return null;
       }
    });

    if (!txInfo) {
      return res.status(404).json({ error: 'Transaction not found on the network' });
    }

    // Verify it's an asset transfer to the Treasury
    const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
    
    const txn = txInfo.txn?.txn || txInfo; // Handle both pending and indexer formats
    
    if (txn.type !== 'axfer' || txn.xaid !== GIGC_ASSET_ID) {
       return res.status(400).json({ error: 'Transaction is not a GIGC transfer' });
    }
    
    const receiver = algosdk.encodeAddress(txn.arcv);
    if (receiver !== treasuryAccount.addr) {
       return res.status(400).json({ error: 'Transaction was not sent to the Treasury' });
    }
    
    // Allow a small margin of error for fees/amounts
    if (txn.aamt < customer.outstandingDebt) {
       return res.status(400).json({ error: 'Transaction amount is less than the outstanding debt' });
    }

    // Clear debt
    customer.outstandingDebt = 0;
    await customer.save();

    res.json({ success: true, message: 'Debt cleared successfully' });

  } catch (error: any) {
    console.error('Clear debt error:', error);
    res.status(500).json({ error: error.message || 'Failed to clear debt' });
  }
});

export default router;
