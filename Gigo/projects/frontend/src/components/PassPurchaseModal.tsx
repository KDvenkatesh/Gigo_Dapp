import { useEffect, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { motion } from 'framer-motion'
import { Coins, Loader2, ShieldCheck, Wallet, X } from 'lucide-react'
import algosdk from 'algosdk'
import axios from 'axios'
import type { PassInfo } from '../hooks/useAlgorandAssets'
import { algorandConfig } from '../config/algorand'

interface PassPurchaseModalProps {
  pass: PassInfo
  ride: any // from useRideContract()
  onClose: () => void
  onSuccess: () => void
}

const PASS_PRICES = {
  silver: 50,
  gold: 150,
  platinum: 300,
}

export function PassPurchaseModal({ pass, ride, onClose, onSuccess }: PassPurchaseModalProps) {
  const { activeAddress, transactionSigner } = useWallet()
  const [gigcBalance, setGigcBalance] = useState<number>(0)
  const [isPassOptedIn, setIsPassOptedIn] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [status, setStatus] = useState<'idle' | 'awaiting-sig' | 'processing' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') {
      BACKEND_URL = 'http://localhost:3001'
    } else if (BACKEND_URL.includes('localhost')) {
      BACKEND_URL = 'https://gigo-dapp.onrender.com'
    }
  }

  const priceGigc = PASS_PRICES[pass.tier]

  useEffect(() => {
    let isMounted = true
    const checkStatus = async () => {
      if (!activeAddress) return
      setLoading(true)
      try {
        // 1. Check GIGC balance and opt-in status
        const gigcStatus = await ride.checkAsaBalance(activeAddress)
        if (isMounted && gigcStatus.optedIn) {
          setGigcBalance(Number(gigcStatus.balance) / 1000000)
        }

        // 2. Check Pass NFT opt-in status
        const passStatus = await ride.checkAsaBalance(activeAddress, pass.assetId)
        if (isMounted) {
          setIsPassOptedIn(passStatus.optedIn)
        }
      } catch (err) {
        console.error('Failed to check pass/GIGC status:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    checkStatus()
    return () => {
      isMounted = false
    }
  }, [activeAddress, pass.assetId, ride])



  const handleConfirm = async () => {
    if (gigcBalance < priceGigc) {
      setErrorMsg('Insufficient GIGC balance to purchase this pass.')
      return
    }

    setStatus('awaiting-sig')
    setErrorMsg('')

    try {
      const algod = new algosdk.Algodv2(algorandConfig.algodToken, algorandConfig.algodServer, algorandConfig.algodPort)
      const suggestedParams = await algod.getTransactionParams().do()
      const amountBase = Math.round(priceGigc * 1000000) // 6 decimals

      const atc = new algosdk.AtomicTransactionComposer()
      let paymentTxIndex = 0;

      // 1. Group Opt-In transaction if not already opted in
      if (!isPassOptedIn) {
        const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: activeAddress!,
          receiver: activeAddress!,
          amount: 0,
          assetIndex: pass.assetId,
          suggestedParams,
        })
        atc.addTransaction({ txn: optInTxn, signer: transactionSigner })
        paymentTxIndex = 1;
      }

      // 2. Sign GIGC transfer txn to treasury wallet
      const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress!,
        receiver: 'FDSKCI2DHPIOTFR2CXHPESMLAUA4Y66B6KKGJ2CDKDY3UX34W43QVN52NA', // Treasury Wallet
        amount: amountBase,
        assetIndex: 763011769, // GIGC
        suggestedParams,
      })

      atc.addTransaction({ txn: paymentTxn, signer: transactionSigner })
      
      const result = await atc.execute(algod, 4)
      const txId = result.txIDs[paymentTxIndex]

      setStatus('processing')

      // 2. Call backend to verify GIGC payment and transfer Pass NFT
      const response = await axios.post(`${BACKEND_URL}/api/passes/buy`, {
        txId,
        tier: pass.tier,
        sender: activeAddress
      })

      if (response.data.success) {
        setStatus('success')
        
        // Reset activation date in local storage so the pass starts fresh
        localStorage.setItem(`gigo_pass_${activeAddress}_${pass.tier}_activated`, new Date().toISOString())

        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else {
        throw new Error(response.data.error || 'Failed to verify transaction on the backend.')
      }
    } catch (err: any) {
      console.error('Pass purchase failed:', err)
      let finalError = err?.response?.data?.error || err?.message || 'Purchase failed.'
      if (finalError.includes('4100') || finalError.includes('pending')) {
        finalError = 'You have a pending transaction in your wallet. Please open your Pera Wallet app to approve or reject it before trying again.'
      }
      setErrorMsg(finalError)
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md overflow-y-auto max-h-[90vh] rounded-[32px] border border-white/10 bg-[#0f111a]/95 shadow-2xl backdrop-blur-2xl"
      >
        <div className="p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-white/5 bg-white/[0.02] p-2 text-white/55 transition hover:bg-white/[0.08] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Coins className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-white">Purchase Pass</h3>
              <p className="text-xs text-white/40">Acquire Gigo NFT ride passes using GIGC</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
              <p className="text-sm text-white/40">Verifying asset information...</p>
            </div>
          ) : (
            <>
              {status === 'idle' && (
                <div className="space-y-5 text-left">
                  {/* Pass details card */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <h4 className="font-bold text-white text-base">{pass.name}</h4>
                    <p className="text-xs text-white/40 mt-1 capitalize">{pass.tier} Tier · {pass.validity}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-white/40">Discount Benefit</span>
                      <span className="font-bold text-emerald-400 text-sm">{pass.discount}% OFF</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">Your GIGC Balance</span>
                      <span className="font-bold text-white">{gigcBalance.toLocaleString()} GIGC</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">Pass Cost</span>
                      <span className="font-bold text-white">{priceGigc} GIGC</span>
                    </div>
                    <div className="border-t border-white/5 pt-2.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-white/70">Payment Amount</span>
                      <span className="font-black text-emerald-400">{priceGigc} GIGC</span>
                    </div>
                  </div>

                  {!isPassOptedIn && (
                    <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3 text-xs text-amber-200/80">
                      <p className="font-semibold text-white flex items-center gap-1.5"><Wallet className="w-4 h-4 text-amber-400" /> Opt-In Required</p>
                      <p className="mt-1 text-white/50 leading-relaxed">
                        This purchase will include a one-time Opt-In transaction for the {pass.name} NFT.
                      </p>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="rounded-xl border border-red-500/15 bg-red-500/[0.05] p-3 text-xs text-red-400 text-center font-mono">
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] py-3 text-sm font-semibold text-white hover:bg-white/[0.06] transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={gigcBalance < priceGigc}
                      className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-40 transition animate-pulse"
                    >
                      Confirm Purchase
                    </button>
                  </div>
                </div>
              )}

              {status === 'awaiting-sig' && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
                  <h4 className="text-lg font-bold text-white font-mono">Awaiting Wallet Signature</h4>
                  <p className="mt-2 text-xs text-white/40 max-w-xs leading-relaxed">
                    Please open Pera Wallet on your device and sign the GIGC payment transaction to proceed.
                  </p>
                </div>
              )}

              {status === 'processing' && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
                  <h4 className="text-lg font-bold text-white font-mono">Processing Pass Purchase</h4>
                  <p className="mt-2 text-xs text-white/40 max-w-xs leading-relaxed">
                    Verifying payment transaction on the blockchain and transferring the {pass.name} NFT to your wallet.
                  </p>
                </div>
              )}

              {status === 'success' && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-black mb-4">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-black text-white font-mono">Pass Acquired!</h4>
                  <p className="mt-2 text-xs text-white/40 max-w-xs leading-relaxed font-mono">
                    Congratulations! Your {pass.name} is now active and benefits will be applied automatically.
                  </p>
                </div>
              )}

              {status === 'error' && (
                <div className="space-y-4 text-left">
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-3">
                      <X className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold text-white font-mono">Purchase Failed</h4>
                    <p className="mt-1 text-xs text-white/40 max-w-xs leading-relaxed">
                      An error occurred while processing your pass purchase.
                    </p>
                  </div>
                  
                  {errorMsg && (
                    <div className="rounded-xl border border-red-500/15 bg-red-500/[0.05] p-3 text-xs text-red-400 text-center font-mono">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    onClick={() => setStatus('idle')}
                    className="w-full rounded-xl bg-white/10 hover:bg-white/20 py-3 text-sm font-semibold text-white transition"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
