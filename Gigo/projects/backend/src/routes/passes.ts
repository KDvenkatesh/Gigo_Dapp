import express from 'express';
import algosdk from 'algosdk';
import axios from 'axios';
import PassPurchase from '../models/PassPurchase';

const router = express.Router();

const ALGORAND_NODE = process.env.ALGORAND_NODE || 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2('', ALGORAND_NODE, '');

const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || 'FDSKCI2DHPIOTFR2CXHPESMLAUA4Y66B6KKGJ2CDKDY3UX34W43QVN52NA';
const TREASURY_MNEMONIC = process.env.TREASURY_MNEMONIC || 'magic mushroom lazy turtle erode matter aspect morning butter join where inherit step guitar skull skill sentence family unveil fortune true bless collect able hazard';
const GIGC_ASSET_ID = Number(process.env.GIGC_ASSET_ID || '763011769');

// Pass NFT asset IDs on Algorand Testnet
const PASS_ASSETS = {
  silver: 763061527,
  gold: 763061537,
  platinum: 763061543,
};

// Prices in GIGC (decimal value, e.g. 50 GIGC)
const PASS_PRICES = {
  silver: 50,
  gold: 150,
  platinum: 300,
};

function safeEncodeAddress(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  try {
    return algosdk.encodeAddress(val);
  } catch (e) {
    return '';
  }
}

async function verifyGigcPayment(
  txId: string,
  expectedSender: string,
  expectedReceiver: string,
  expectedAssetAmountBase: number
): Promise<boolean> {
  // 1. Try Algod first
  try {
    const txInfo = await algodClient.pendingTransactionInformation(txId).do();
    const confirmedRound = txInfo['confirmed-round'] || txInfo['confirmedRound'];
    const txnOuter = txInfo['txn'];
    const txnInner = txnOuter ? txnOuter['txn'] : null;

    if (confirmedRound && txnInner) {
      const type = txnInner['type'] || txnInner['tx-type'] || '';
      const sender = safeEncodeAddress(txnInner['snd']);
      const receiver = safeEncodeAddress(txnInner['arcv']);
      const amount = txnInner['aamt'] || 0;
      const assetId = txnInner['xaid'] || 0;

      const matchesType = type === 'axfer';
      
      if (
        matchesType &&
        sender === expectedSender &&
        receiver === expectedReceiver &&
        Number(amount) === expectedAssetAmountBase &&
        Number(assetId) === GIGC_ASSET_ID
      ) {
        return true;
      }
    }
  } catch (algodErr) {
    console.warn(`Algod tx fetch failed for ${txId}, trying Indexer:`, algodErr);
  }

  // 2. Fallback to Indexer
  try {
    const response = await axios.get(`https://testnet-idx.algonode.cloud/v2/transactions/${txId}`);
    const tx = response.data?.transaction;
    if (tx) {
      const type = tx['tx-type'] || tx['type'];
      const sender = tx['sender'];
      const assetTx = tx['asset-transfer-transaction'];
      const receiver = assetTx?.['receiver'];
      const amount = assetTx?.['amount'] || 0;
      const assetId = assetTx?.['asset-id'];
      const confirmedRound = tx['confirmed-round'];

      if (
        confirmedRound &&
        type === 'axfer' &&
        sender === expectedSender &&
        receiver === expectedReceiver &&
        Number(amount) === expectedAssetAmountBase &&
        Number(assetId) === GIGC_ASSET_ID
      ) {
        return true;
      }
    }
  } catch (indexerErr) {
    console.error(`Indexer tx fetch failed for ${txId}:`, indexerErr);
  }

  return false;
}

// Purchase NFT Pass using GIGC
router.post('/buy', async (req, res) => {
  try {
    const { txId, tier, sender } = req.body;

    if (!txId || !tier || !sender) {
      return res.status(400).json({ error: 'Missing required parameters: txId, tier, sender' });
    }

    const lowerTier = (tier as string).toLowerCase();
    if (lowerTier !== 'silver' && lowerTier !== 'gold' && lowerTier !== 'platinum') {
      return res.status(400).json({ error: 'Invalid tier. Must be silver, gold, or platinum.' });
    }

    const tierKey = lowerTier as keyof typeof PASS_PRICES;
    const priceGigc = PASS_PRICES[tierKey];
    const expectedAssetAmountBase = Math.round(priceGigc * 1000000); // 6 decimals
    const passAssetId = PASS_ASSETS[tierKey];

    // 1. Prevent duplicate transaction processing
    const existing = await PassPurchase.findOne({ txId });
    if (existing) {
      if (existing.status === 'success') {
        return res.json({ success: true, alreadyProcessed: true, tx: existing });
      } else {
        return res.status(400).json({ error: 'Transaction is already being processed or failed' });
      }
    }

    // Create a pending entry in database
    const pendingPurchase = await PassPurchase.create({
      txId,
      sender,
      tier: lowerTier,
      passAssetId,
      priceGigc,
      status: 'pending'
    });

    // 2. Verify GIGC payment received on-chain
    console.log(`Verifying GIGC payment transaction ${txId} sender=${sender} receiver=${TREASURY_ADDRESS} amount=${expectedAssetAmountBase}...`);
    const isVerified = await verifyGigcPayment(txId, sender, TREASURY_ADDRESS, expectedAssetAmountBase);

    if (!isVerified) {
      pendingPurchase.status = 'failed';
      await pendingPurchase.save();
      return res.status(400).json({ error: 'GIGC payment transaction could not be verified on-chain. Please check sender, receiver, and amount.' });
    }

    // 3. Transfer the Pass NFT Asset (1 unit) to the sender
    console.log(`GIGC Payment verified. Transferring Pass NFT Asset ${passAssetId} (${lowerTier}) to ${sender}...`);

    if (!TREASURY_MNEMONIC) {
      pendingPurchase.status = 'failed';
      await pendingPurchase.save();
      return res.status(500).json({ error: 'Treasury wallet mnemonic is not configured on the backend.' });
    }

    const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
    const suggestedParams = await algodClient.getTransactionParams().do();
    
    // Transfer 1 unit of Pass NFT
    const transferTx = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: treasuryAccount.addr,
      to: sender,
      amount: 1, // 1 NFT Pass
      assetIndex: passAssetId,
      suggestedParams,
    });

    const signedTx = transferTx.signTxn(treasuryAccount.sk);
    const { txId: transferTxId } = await algodClient.sendRawTransaction(signedTx).do();
    
    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, transferTxId, 4);

    // Update database status to success
    pendingPurchase.status = 'success';
    pendingPurchase.transferTxId = transferTxId;
    await pendingPurchase.save();

    console.log(`Pass NFT transfer successful! TxID: ${transferTxId}`);
    return res.json({
      success: true,
      transferTxId,
      tx: pendingPurchase
    });

  } catch (error: any) {
    console.error('Error in pass purchase processing:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error processing pass purchase' });
  }
});

export default router;
