import express from 'express';
import algosdk from 'algosdk';
import axios from 'axios';
import TopUpTransaction from '../models/TopUpTransaction';

const router = express.Router();

const ALGORAND_NODE = process.env.ALGORAND_NODE || 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2('', ALGORAND_NODE, '');

const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || 'FDSKCI2DHPIOTFR2CXHPESMLAUA4Y66B6KKGJ2CDKDY3UX34W43QVN52NA';
const TREASURY_MNEMONIC = process.env.TREASURY_MNEMONIC || '';
const GIGC_ASSET_ID = Number(process.env.GIGC_ASSET_ID || '763011769');
const CONVERSION_RATIO = Number(process.env.CONVERSION_RATIO || '100'); // 100 GIGC = 1 ALGO

function safeEncodeAddress(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  try {
    return algosdk.encodeAddress(val);
  } catch (e) {
    return '';
  }
}

async function verifyAlgoPayment(
  txId: string,
  expectedSender: string,
  expectedReceiver: string,
  expectedMicroAlgos: number
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
      const receiver = safeEncodeAddress(txnInner['rcv']);
      const amount = txnInner['amt'] || 0;

      const matchesType = type === 'pay' || type === 'payment' || type === '' || type === undefined;
      
      if (
        matchesType &&
        sender === expectedSender &&
        receiver === expectedReceiver &&
        Number(amount) === expectedMicroAlgos
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
      const paymentTx = tx['payment-transaction'];
      const receiver = paymentTx?.['receiver'];
      const amount = paymentTx?.['amount'] || 0;
      const confirmedRound = tx['confirmed-round'];

      if (
        confirmedRound &&
        (type === 'pay' || type === 'payment') &&
        sender === expectedSender &&
        receiver === expectedReceiver &&
        Number(amount) === expectedMicroAlgos
      ) {
        return true;
      }
    }
  } catch (indexerErr) {
    console.error(`Indexer tx fetch failed for ${txId}:`, indexerErr);
  }

  return false;
}

// Top Up GIGC using ALGO
router.post('/', async (req, res) => {
  try {
    const { txId, gigcAmount, sender } = req.body;

    if (!txId || !gigcAmount || !sender) {
      return res.status(400).json({ error: 'Missing required parameters: txId, gigcAmount, sender' });
    }

    const numericGigcAmount = Number(gigcAmount);
    if (isNaN(numericGigcAmount) || numericGigcAmount <= 0) {
      return res.status(400).json({ error: 'Invalid gigcAmount' });
    }

    // 1. Prevent duplicate transaction processing
    const existing = await TopUpTransaction.findOne({ txId });
    if (existing) {
      if (existing.status === 'success') {
        return res.json({ success: true, alreadyProcessed: true, tx: existing });
      } else {
        return res.status(400).json({ error: 'Transaction is already being processed or failed' });
      }
    }

    // Calculate amounts
    const algoAmountMicro = Math.round(numericGigcAmount * (1000000 / CONVERSION_RATIO));
    const gigcAmountBase = Math.round(numericGigcAmount * 1000000);

    // Create a pending entry in database
    const pendingTx = await TopUpTransaction.create({
      txId,
      sender,
      algoAmountMicro,
      gigcAmountBase,
      status: 'pending'
    });

    // 2. Verify ALGO payment received on-chain
    console.log(`Verifying payment transaction ${txId} sender=${sender} receiver=${TREASURY_ADDRESS} amount=${algoAmountMicro}...`);
    const isVerified = await verifyAlgoPayment(txId, sender, TREASURY_ADDRESS, algoAmountMicro);

    if (!isVerified) {
      pendingTx.status = 'failed';
      await pendingTx.save();
      return res.status(400).json({ error: 'Payment transaction could not be verified on-chain. Please check sender, receiver, and amount.' });
    }

    // 3. Send corresponding GIGC ASA amount
    console.log(`Payment verified. Initiating GIGC transfer of ${numericGigcAmount} GIGC to ${sender}...`);
    
    if (!TREASURY_MNEMONIC) {
      pendingTx.status = 'failed';
      await pendingTx.save();
      return res.status(500).json({ error: 'Treasury wallet mnemonic is not configured on the backend.' });
    }

    const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
    const suggestedParams = await algodClient.getTransactionParams().do();
    
    const transferTx = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: treasuryAccount.addr,
      to: sender,
      amount: gigcAmountBase,
      assetIndex: GIGC_ASSET_ID,
      suggestedParams,
    });

    const signedTx = transferTx.signTxn(treasuryAccount.sk);
    const { txId: transferTxId } = await algodClient.sendRawTransaction(signedTx).do();
    
    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, transferTxId, 4);

    // Update database status to success
    pendingTx.status = 'success';
    pendingTx.transferTxId = transferTxId;
    await pendingTx.save();

    console.log(`GIGC transfer successful! TxID: ${transferTxId}`);
    return res.json({
      success: true,
      transferTxId,
      tx: pendingTx
    });

  } catch (error: any) {
    console.error('Error in top-up processing:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error processing top-up' });
  }
});

export default router;
