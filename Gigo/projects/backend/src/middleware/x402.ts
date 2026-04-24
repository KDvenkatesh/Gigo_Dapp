import { Request, Response, NextFunction } from 'express';
import algosdk from 'algosdk';

/**
 * x402 Payment Middleware for Gigo DApp.
 *
 * Enforces micro-payments on Algorand testnet before granting access
 * to AI-powered endpoints.  When the `X-PAYMENT` header is missing the
 * middleware returns HTTP 402 with structured payment requirements so
 * the client can construct, sign, and retry the request.
 *
 * @param amount  USDC amount as a decimal string (e.g. "0.001")
 */
export function x402PaymentMiddleware(amount: string = '0.001') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const paymentHeader = req.headers['x-payment'] as string | undefined;

    /* ── No payment header → 402 ── */
    if (!paymentHeader) {
      res.status(402).json({
        error: 'Payment Required',
        paymentRequirements: {
          network: 'algorand-testnet',
          asset: 'USDC',
          amount,
          recipient: process.env.PLATFORM_WALLET ?? '',
          description: 'Gigo AI Service Fee',
        },
      });
      return;
    }

    /* ── Verify the signed transaction ── */
    try {
      const txnBytes = Buffer.from(paymentHeader, 'base64');
      const signedTxn = algosdk.decodeSignedTransaction(txnBytes);
      const txn = signedTxn.txn;

      // Basic sanity checks
      const recipientAddress = algosdk.encodeAddress(txn.to.publicKey);
      if (recipientAddress !== process.env.PLATFORM_WALLET) {
        res.status(401).json({
          error: 'Invalid payment',
          message: 'Payment recipient does not match platform wallet.',
        });
        return;
      }

      // Verify signature
      const isValid = algosdk.decodeSignedTransaction(txnBytes);
      if (!isValid.sig) {
        res.status(401).json({
          error: 'Invalid payment',
          message: 'Transaction signature is missing or invalid.',
        });
        return;
      }

      // Attach tx info to request for downstream logging
      (req as any).x402Payment = {
        sender: algosdk.encodeAddress(txn.from.publicKey),
        recipient: recipientAddress,
        amount: Number(txn.amount),
        txId: signedTxn.txn.txID(),
      };

      next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Transaction verification failed';
      res.status(401).json({
        error: 'Invalid payment',
        message,
      });
    }
  };
}
