import { useWallet } from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';
import { useCallback, useMemo } from 'react';
import { algorandConfig } from '../config/algorand';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * x402 Payment Hook for Gigo DApp.
 *
 * Provides two functions:
 *   1. `makeX402Payment`  – build & sign an Algorand payment txn with Pera
 *   2. `callX402API`      – POST to a backend endpoint, auto-handle 402
 *
 * When the backend returns HTTP 402, the hook reads paymentRequirements,
 * prompts the user to sign via their connected wallet, then retries the
 * request with the signed transaction in the `X-PAYMENT` header.
 */
  export function useX402() {
    const { activeAddress, signTransactions } = useWallet();
  
    const algod = useMemo(
      () =>
        new algosdk.Algodv2(
          algorandConfig.algodToken,
          algorandConfig.algodServer,
          algorandConfig.algodPort,
        ),
      [],
    );
  
    /**
     * Build and sign an Algorand payment transaction.
     * Returns the base64-encoded signed transaction.
     */
    const makeX402Payment = useCallback(
      async (amount: number, recipient: string): Promise<string> => {
        if (!activeAddress || !signTransactions) {
          throw new Error('Wallet not connected. Please connect Pera Wallet first.');
        }
  
        const params = await algod.getTransactionParams().do();
  
        // Convert USDC-like amount to microAlgos for testnet simulation
        // On testnet we pay in ALGO (1 ALGO = 1_000_000 microAlgos)
        const microAlgos = Math.max(1000, Math.round(amount * 1_000_000));
  
        const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: recipient,
          amount: microAlgos,
          suggestedParams: params,
          note: new TextEncoder().encode('Gigo x402 AI payment'),
        });
  
        // Sign via Pera / connected wallet
        const encodedTxn = txn.toByte();
        const signedTxns = await signTransactions([encodedTxn]);
  
        const signedTxn = signedTxns[0];
        if (!signedTxn) {
          throw new Error('Transaction signing was cancelled or failed.');
        }
  
        // Return base64 representation using native btoa to avoid Buffer polyfill issues
        return btoa(String.fromCharCode(...signedTxn));
      },
      [activeAddress, signTransactions, algod],
    );

  /**
   * Call an x402-protected API endpoint.
   * Automatically handles 402 responses by prompting payment and retrying.
   */
  const callX402API = useCallback(
    async <T = unknown>(endpoint: string, body: Record<string, unknown>): Promise<T> => {
      const url = `${BACKEND_URL}${endpoint}`;

      // First attempt — no payment header
      const firstResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // If not 402, return directly
      if (firstResponse.status !== 402) {
        if (!firstResponse.ok) {
          const errorData = await firstResponse.json().catch(() => ({}));
          throw new Error(
            (errorData as { message?: string }).message ??
              `API error: ${firstResponse.status}`,
          );
        }
        return (await firstResponse.json()) as T;
      }

      // 402 — extract payment requirements and pay
      const { paymentRequirements } = (await firstResponse.json()) as {
        paymentRequirements: {
          amount: string;
          recipient: string;
        };
      };

      const paymentAmount = parseFloat(paymentRequirements.amount);
      const signedTxBase64 = await makeX402Payment(paymentAmount, paymentRequirements.recipient);

      // Retry with payment header
      const retryResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': signedTxBase64,
        },
        body: JSON.stringify(body),
      });

      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => ({}));
        throw new Error(
          (errorData as { message?: string }).message ??
            `Payment verified but API error: ${retryResponse.status}`,
        );
      }

      return (await retryResponse.json()) as T;
    },
    [makeX402Payment],
  );

  return {
    makeX402Payment,
    callX402API,
    isWalletReady: Boolean(activeAddress && signTransactions),
  };
}
