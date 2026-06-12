import { populateAppCallResources } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { algorandConfig } from '../config/algorand'
import { destinationOptions, vehicleOptions } from '../data/mockRide'
import { rideAbiMethods } from '../contracts/rideAbi'
import { formatAlgoAmount } from '../lib/location'
import { RideStatus, type ContractNotice, type RideLocation, type RideRecord, type ToastMessage } from '../types/ride'
import axios from 'axios'

let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
type RideActionState = {
  createRide: boolean
  payout: boolean
  refund: boolean
  refresh: boolean
  optIn: boolean
  acceptRide: boolean
  endRide: boolean
  startRide: boolean
  storeOtp: boolean
}

function createToast(input: Omit<ToastMessage, 'id'>): ToastMessage {
  return { id: crypto.randomUUID(), ...input }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : 'Unknown contract error'
}

function uint64FromBytes(value: Uint8Array) {
  const view = new DataView(value.buffer, value.byteOffset, value.byteLength)
  return view.getBigUint64(0, false)
}

function toBuffer(bytes: Uint8Array) {
  return Buffer.from(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
}

function decodeMaybeBase64(value: string | Uint8Array) {
  return typeof value === 'string' ? Uint8Array.from(Buffer.from(value, 'base64')) : new Uint8Array(value)
}

export function useRideContract() {
  const { activeAddress, transactionSigner } = useWallet()
  const algod = useMemo(
    () => new algosdk.Algodv2(algorandConfig.algodToken, algorandConfig.algodServer, algorandConfig.algodPort),
    [],
  )
  const appAddress = useMemo(
    () => (algorandConfig.appId ? algosdk.getApplicationAddress(Number(algorandConfig.appId)).toString() : null),
    [],
  )
  const [rides, setRides] = useState<RideRecord[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicleOptions[1].id)
  const [selectedDestination, setSelectedDestination] = useState<RideLocation>(destinationOptions[0])
  const [destinationInput, setDestinationInput] = useState(destinationOptions[0].label)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [actionState, setActionState] = useState<RideActionState>({
    createRide: false,
    payout: false,
    refund: false,
    refresh: false,
    optIn: false,
    acceptRide: false,
    endRide: false,
    startRide: false,
    storeOtp: false,
  })
  

  const appReady = Boolean(activeAddress && algorandConfig.appId !== null)
  const selectedVehicle =
    vehicleOptions.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicleOptions[1]
  
  const [focusedRideId, setFocusedRideId] = useState<bigint | null>(null)
  const focusedRide = useMemo(() => 
    rides.find(r => r.rideId === focusedRideId) || null,
    [rides, focusedRideId]
  )

  const customerNotice: ContractNotice = {
    tone: 'success',
    title: 'Optimized Architecture Active',
    description: 'V5 Robust Verification is now active. This handles escrow transactions with high reliability.',
    icon: CheckCircle2,
  }

  const driverNotice: ContractNotice = {
    tone: 'neutral',
    title: 'Instant Payouts',
    description: 'Payments are locked at the start and released instantly by the customer upon completion.',
    icon: CircleAlert,
  }

  function pushToast(toast: Omit<ToastMessage, 'id'>) {
    const next = createToast(toast)
    setToasts((current) => [next, ...current].slice(0, 4))
    setTimeout(() => setToasts(c => c.filter(t => t.id !== next.id)), 4000)
  }

  function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  function updateActionState(key: keyof RideActionState, value: boolean) {
    setActionState((current) => ({ ...current, [key]: value }))
  }

  async function executeMethod({
    method,
    args,
    sender,
    feeMultiplier = 1,
    extraTxns = [],
    boxes,
  }: {
    method: algosdk.ABIMethod
    args: any[]
    sender: string
    feeMultiplier?: number
    extraTxns?: algosdk.Transaction[]
    boxes?: algosdk.BoxReference[]
  }) {
    if (!algorandConfig.appId || !activeAddress || !transactionSigner) {
      throw new Error('Wallet/App not ready.')
    }

    const params = await algod.getTransactionParams().do()
    if (feeMultiplier > 1) {
      params.fee = BigInt(1000 * feeMultiplier)
      params.flatFee = true
    }
    const atc = new algosdk.AtomicTransactionComposer()

    for (const txn of extraTxns) {
      atc.addTransaction({ txn, signer: transactionSigner })
    }

    // Transform args to handle transactions
    const methodArgs = args.map(arg => {
        if (arg instanceof algosdk.Transaction) {
            return { txn: arg, signer: transactionSigner }
        }
        return arg
    })

    atc.addMethodCall({
      appID: Number(algorandConfig.appId),
      method,
      methodArgs,
      sender,
      suggestedParams: params,
      signer: transactionSigner,
      boxes,
    })

    // Bypass populateAppCallResources to prevent WalletConnect transaction ID mismatch bugs
    return atc.execute(algod, 4)
  }

  async function refreshRides() {
    if (!algorandConfig.appId) return

    updateActionState('refresh', true)
    try {
      const boxes = await algod.getApplicationBoxes(Number(algorandConfig.appId)).do()
      const rideMap = new Map<string, Partial<RideRecord>>()
      
      const targetBoxes = boxes.boxes.filter((box: any) => {
        try {
          const name = decodeMaybeBase64(box.name)
          const prefix = new TextDecoder().decode(name.slice(0, 2))
          return prefix === 'c_' || prefix === 'f_'
        } catch { return false }
      })

      for (const box of targetBoxes) {
        const name = decodeMaybeBase64(box.name)
        const prefix = new TextDecoder().decode(name.slice(0, 2))
        const rideId = uint64FromBytes(name.slice(2))
        const key = rideId.toString()
        
        const valueResponse = await algod.getApplicationBoxByName(Number(algorandConfig.appId), toBuffer(name)).do()
        const value = decodeMaybeBase64(valueResponse.value)
        
        const current = rideMap.get(key) ?? { rideId, status: RideStatus.REQUESTED }
        if (prefix === 'c_') current.customer = algosdk.encodeAddress(value)
        if (prefix === 'f_') current.fareMicroAlgos = uint64FromBytes(value)
        
        rideMap.set(key, current)
      }

      const response = await axios.get(`${BACKEND_URL}/api/rides`);
      const mongoRides = response.data;
      
      const finalRides = mongoRides.map((mongoRide: any) => {
         const chainData = rideMap.get(mongoRide.rideId.toString()) || {};
         return {
            rideId: BigInt(mongoRide.rideId),
            customer: mongoRide.customer,
            rider: mongoRide.rider,
            pickup: mongoRide.pickup,
            drop: mongoRide.drop,
            status: mongoRide.status,
            fareMicroAlgos: mongoRide.fareMicroAlgos ? BigInt(mongoRide.fareMicroAlgos) : (chainData.fareMicroAlgos || 0n),
            otp: mongoRide.otp,
            paymentLocked: mongoRide.paymentLocked,
            vehicleType: mongoRide.vehicleType,
            customerPressedImHere: mongoRide.customerPressedImHere,
            driverArrivalAt: mongoRide.driverArrivalAt,
            waitTimeFee: mongoRide.waitTimeFee,
            receiptHash: mongoRide.receiptHash,
            settlementReason: mongoRide.settlementReason,
            weatherMultiplier: mongoRide.weatherMultiplier,
            trafficDelayFee: mongoRide.trafficDelayFee,
            settlementTxId: mongoRide.settlementTxId,
            cancellationReason: mongoRide.cancellationReason,
            isSurge: mongoRide.isSurge,
            updatedAt: mongoRide.updatedAt,
            presenceEvidence: mongoRide.presenceEvidence
         };
      });

      setRides(finalRides.sort((a: any, b: any) => Number(b.rideId - a.rideId)))
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      updateActionState('refresh', false)
    }
  }

  async function createRide(pickup: RideLocation, drop: RideLocation, fareMicroAlgos: bigint, isSurge: boolean = false) {
    if (!activeAddress) throw new Error('Connect wallet first.')
    
    updateActionState('createRide', true)
    try {
      const rideId = BigInt(Date.now())

      const suggestedParams = await algod.getTransactionParams().do()
      
      const mbrTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: algosdk.getApplicationAddress(Number(algorandConfig.appId)),
        amount: 29000,
        suggestedParams,
      })

      const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: algosdk.getApplicationAddress(Number(algorandConfig.appId)),
        amount: Number(fareMicroAlgos),
        assetIndex: 763011769,
        suggestedParams,
      })

      const rideIdBytes = algosdk.encodeUint64(rideId)
      const boxes: algosdk.BoxReference[] = [
        { appIndex: Number(algorandConfig.appId), name: new Uint8Array([...Buffer.from('c_'), ...rideIdBytes]) },
        { appIndex: Number(algorandConfig.appId), name: new Uint8Array([...Buffer.from('f_'), ...rideIdBytes]) },
      ]

      // Pass paymentTxn as the first argument (axfer)
      await executeMethod({
        method: rideAbiMethods.init_escrow,
        args: [paymentTxn, rideId],
        sender: activeAddress,
        extraTxns: [mbrTxn],
        boxes,
      })

      await axios.post(`${BACKEND_URL}/api/rides/create`, {
         rideId: rideId.toString(),
         customer: activeAddress,
         pickup,
         drop,
         fareMicroAlgos: fareMicroAlgos.toString(),
         vehicleType: selectedVehicle.name,
         status: RideStatus.REQUESTED,
         paymentLocked: true,
         isSurge
      });

      pushToast({
        tone: 'success',
        title: 'Ride Escrow Created',
        description: `Funds locked for ride #${rideId.toString()}.`,
      })
      
      await refreshRides()
      return rideId
    } catch (error) {
      pushToast({ tone: 'error', title: 'Escrow failed', description: getErrorMessage(error) })
      throw error
    } finally {
      updateActionState('createRide', false)
    }
  }

  async function releasePayment(rideId: bigint, riderAddress: string) {
    if (!activeAddress) throw new Error('Connect wallet first.')
    
    updateActionState('payout', true)
    try {
      const rideIdBytes = algosdk.encodeUint64(rideId)
      const boxes: algosdk.BoxReference[] = [
        { appIndex: Number(algorandConfig.appId), name: new Uint8Array([...Buffer.from('c_'), ...rideIdBytes]) },
        { appIndex: Number(algorandConfig.appId), name: new Uint8Array([...Buffer.from('f_'), ...rideIdBytes]) },
      ]

      await executeMethod({
        method: rideAbiMethods.payout,
        args: [rideId, riderAddress],
        sender: activeAddress,
        feeMultiplier: 2,
        boxes,
      })

      await axios.post(`${BACKEND_URL}/api/rides/update-status`, {
         rideId: rideId.toString(),
         status: RideStatus.PAID,
         paymentLocked: false
      });

      pushToast({
        tone: 'success',
        title: 'Payment Released',
        description: `Rider ${riderAddress.slice(0,6)}... has been paid!`,
      })
      await refreshRides()
    } catch (error) {
      pushToast({ tone: 'error', title: 'Payout failed', description: getErrorMessage(error) })
      throw error
    } finally {
      updateActionState('payout', false)
    }
  }

  async function checkAsaBalance(address: string, assetId: number = 763011769): Promise<{ optedIn: boolean; balance: bigint }> {
    try {
      const info = await algod.accountAssetInformation(address, assetId).do()
      const holding = (info as any)['asset-holding'] || (info as any)['assetHolding'] || info
      const amount = holding['amount'] !== undefined ? holding['amount'] : (holding.amount ?? 0)
      return { optedIn: true, balance: BigInt(amount) }
    } catch (error: any) {
      return { optedIn: false, balance: 0n }
    }
  }

  async function optInToAsa(assetId: number = 763011769) {
    if (!activeAddress || !transactionSigner) return
    updateActionState('optIn', true)
    try {
      const suggestedParams = await algod.getTransactionParams().do()
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: activeAddress,
        amount: 0,
        assetIndex: assetId,
        suggestedParams,
      })
      const atc = new algosdk.AtomicTransactionComposer()
      atc.addTransaction({ txn, signer: transactionSigner })
      await atc.execute(algod, 4)
      pushToast({ tone: 'success', title: 'Opt-in successful', description: `Asset enabled.` })
      return true
    } finally {
      updateActionState('optIn', false)
    }
  }

  async function optInContractToAsa() {
    if (!activeAddress || !transactionSigner) throw new Error('Connect wallet first.')
    
    updateActionState('optIn', true)
    try {
      const suggestedParams = await algod.getTransactionParams().do()
      
      // Provide 0.2 ALGO to the contract to cover the Min Balance Requirement (MBR) for the base account (100k) + holding 1 ASA (100k)
      const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: algosdk.getApplicationAddress(Number(algorandConfig.appId)),
        amount: 200000, 
        suggestedParams,
      })
      
      const atc = new algosdk.AtomicTransactionComposer()
      atc.addTransaction({ txn: fundTxn, signer: transactionSigner })
      
      // Double the fee for the ABI call because it fires 1 inner transaction
      const callParams = { ...suggestedParams, fee: 2000, flatFee: true }
      
      atc.addMethodCall({
        appID: Number(algorandConfig.appId),
        method: rideAbiMethods.opt_in_to_asa,
        methodArgs: [],
        sender: activeAddress,
        suggestedParams: callParams,
        signer: transactionSigner,
      })

      const populated = await populateAppCallResources(atc, algod)
      await populated.execute(algod, 4)
      
      pushToast({ tone: 'success', title: 'Contract Initialized', description: `Escrow contract is now ready to receive GIGC.` })
      return true
    } catch (error) {
      pushToast({ tone: 'error', title: 'Contract Initialization failed', description: getErrorMessage(error) })
      throw error
    } finally {
      updateActionState('optIn', false)
    }
  }

  function generateOtp() { return String(Math.floor(1000 + Math.random() * 9000)) }
  function updateDestinationInput(v: string) { setDestinationInput(v) }
  function commitDestination(v: string) { setSelectedDestination(destinationOptions.find(d => d.label === v) || { label: v, lat: 0, lng: 0 }) }

  const refreshRidesEvent = useEffectEvent(() => { void refreshRides() })
  useEffect(() => {
    refreshRidesEvent()
    const interval = window.setInterval(refreshRidesEvent, 30000)
    return () => window.clearInterval(interval)
  }, [])

    const cancelRide = async (rideId: bigint) => {
    if (!activeAddress) return;
    try {
      setActionState(s => ({ ...s, endRide: true }))
      // Assuming we need current lat/lng, but we can pass 0,0 if unavailable.
      const response = await axios.post(`${BACKEND_URL}/api/rides/customer-cancel`, {
        rideId: rideId.toString(),
        currentLat: 0,
        currentLng: 0
      });
      if (response.data.success) {
        await refreshRides();
        pushToast({ tone: 'success', title: 'Ride Cancelled', description: 'Ride cancelled successfully' });
      }
    } catch (error: any) {
      console.error('Failed to cancel ride', error);
      pushToast({ tone: 'error', title: 'Error', description: error?.response?.data?.error || 'Failed to cancel ride' });
    } finally {
      setActionState(s => ({ ...s, endRide: false }))
    }
  }

  const reportCustomerNoShow = async (rideId: bigint) => {
    if (!activeAddress) return;
    try {
      setActionState(s => ({ ...s, endRide: true }))
      const response = await axios.post(`${BACKEND_URL}/api/rides/customer-no-show`, {
        rideId: rideId.toString()
      });
      if (response.data.success) {
        await refreshRides();
        pushToast({ tone: 'success', title: 'Customer No-Show', description: 'Customer no-show recorded. Fare transferred.' });
      }
    } catch (error: any) {
      console.error('Failed to report customer no-show', error);
      pushToast({ tone: 'error', title: 'Error', description: error?.response?.data?.error || 'Failed to report customer no-show' });
    } finally {
      setActionState(s => ({ ...s, endRide: false }))
    }
  }

  return {
    activeAddress,
    appReady,
    appId: algorandConfig.appId,
    appAddress,
    rides,
    customerRides: rides.filter(r => r.customer === activeAddress),
    driverRides: rides.filter(r => r.rider === activeAddress || r.status === RideStatus.REQUESTED),
    selectedVehicle,
    selectedVehicleId,
    setSelectedVehicleId,
    selectedDestination,
    setSelectedDestination,
    destinationInput,
    updateDestinationInput,
    commitDestination,
    vehicleOptions,
    destinationOptions,
    actionState,
    customerNotice,
    driverNotice,
    formatAlgoAmount,
    createRide,
    releasePayment,
    customerConfirmPayout: async (rideId: bigint) => {
      if (!activeAddress) throw new Error('Connect wallet first.')
      updateActionState('payout', true)
      try {
        const response = await axios.post(`${BACKEND_URL}/api/rides/end-ride`, {
          rideId: rideId.toString(),
        })
        if (response.data?.payoutTxId) {
          pushToast({
            tone: 'success',
            title: 'Payment Released',
            description: `Payment released! TxID: ${response.data.payoutTxId.slice(0, 12)}...`,
          })
          // Optimistically update the UI to avoid waiting for a full refresh
          setRides(prev => prev.map(r => r.rideId === rideId ? { ...r, status: RideStatus.RIDE_COMPLETED } : r))
        }
        await refreshRides()
      } catch (error: any) {
        const msg = error?.response?.data?.error || error?.message || 'Failed to confirm payout'
        pushToast({ tone: 'error', title: 'Payout failed', description: msg })
        throw error
      } finally {
        updateActionState('payout', false)
      }
    },
    cancelRide,
    reportCustomerNoShow,
    optInContractToAsa,
    generateOtp,
    pushToast,
    toasts,
    dismissToast,
    refreshRides,
    checkAsaBalance,
    optInToAsa,
    focusedRide,
    focusedRideId,
    setFocusedRideId,
    clearHistory: () => {
      setRides([])
    },
    acceptRide: async (rideId: bigint) => {
      if (!activeAddress) throw new Error('Connect wallet first.')
      updateActionState('acceptRide', true)
      try {
        const rideIdBytes = algosdk.encodeUint64(rideId)
        const boxes: algosdk.BoxReference[] = [
          { appIndex: Number(algorandConfig.appId), name: new Uint8Array([...Buffer.from('c_'), ...rideIdBytes]) },
          { appIndex: Number(algorandConfig.appId), name: new Uint8Array([...Buffer.from('d_'), ...rideIdBytes]) },
        ]

        const suggestedParams = await algod.getTransactionParams().do()
        
        // 19,300 microAlgos MBR required for the new d_ box
        const mbrTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: algosdk.getApplicationAddress(Number(algorandConfig.appId)),
          amount: 19300,
          suggestedParams,
        })

        await executeMethod({
          method: rideAbiMethods.accept_ride,
          args: [rideId, activeAddress],
          sender: activeAddress,
          extraTxns: [mbrTxn],
          boxes,
        })

        await fetch(`${BACKEND_URL}/api/rides/update-status`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             rideId: rideId.toString(),
             status: RideStatus.RIDER_ASSIGNED,
             rider: activeAddress
           })
        });
        await refreshRides()
      } catch (error: any) {
        if (error?.message?.includes('another transaction request in progress') || error?.message?.includes('4100')) {
          pushToast({ tone: 'error', title: 'Signature Pending', description: 'Please open Pera Wallet to sign the pending transaction.' });
        } else {
          pushToast({ tone: 'error', title: 'Accept Failed', description: getErrorMessage(error) });
        }
        throw error;
      } finally {
        updateActionState('acceptRide', false)
      }
    },
    endRide: async (rideId: bigint, driverLocation?: { lat: number; lng: number }) => {
      if (!activeAddress) throw new Error('Connect wallet first.')
      updateActionState('endRide', true)
      try {
        if (!driverLocation) {
          throw new Error('Driver location is required to end the ride. Please enable location services.')
        }
        const response = await axios.post(`${BACKEND_URL}/api/rides/driver-dropoff`, {
          rideId: rideId.toString(),
          driverAddress: activeAddress,
          driverLat: driverLocation.lat,
          driverLng: driverLocation.lng,
        })
        if (response.data?.success) {
          pushToast({
            tone: 'success',
            title: 'Ride Ended',
            description: `Waiting for customer to confirm payment...`,
          })
        }
        await refreshRides()
      } catch (error: any) {
        const msg = error?.response?.data?.error || error?.message || 'Failed to end ride'
        pushToast({ tone: 'error', title: 'Could not end ride', description: msg })
        throw error
      } finally {
        updateActionState('endRide', false)
      }
    },
    storeOtp: async (rideId: bigint, otp: string) => {
        updateActionState('storeOtp', true)
        try {
            await axios.post(`${BACKEND_URL}/api/rides/store-otp`, {
               rideId: rideId.toString(),
               otp
            });
            await refreshRides()
        } finally {
            updateActionState('storeOtp', false)
        }
    },
    startRideWithOtp: async (rideRecord: RideRecord, otp: string) => {
      updateActionState('startRide', true)
      try {
        // Fetch the absolute latest ride state from backend to prevent sync issues
        const response = await axios.get(`${BACKEND_URL}/api/rides`);
        const latestRides = response.data;
        const liveRide = latestRides.find((r: any) => r.rideId.toString() === rideRecord.rideId.toString());
        
        if (!liveRide) {
          return { canExecute: false, reason: 'Ride no longer exists.' }
        }

        const cleanRecordOtp = (liveRide.otp || '').trim()
        const cleanInputOtp = (otp || '').trim()
        
        if (!cleanRecordOtp) {
          return { canExecute: false, reason: 'Customer has not generated an OTP yet. Ask them to generate it.' }
        }
        
        if (cleanRecordOtp === cleanInputOtp) {
          await axios.post(`${BACKEND_URL}/api/rides/update-status`, {
             rideId: rideRecord.rideId.toString(),
             status: RideStatus.RIDE_STARTED
          });
          await refreshRides()
          return { canExecute: true }
        }
        return { canExecute: false, reason: 'Invalid OTP. Please try again.' }
      } catch (error: any) {
        console.error('OTP verification failed:', error);
        return { canExecute: false, reason: error?.message || 'Network error verifying OTP' }
      } finally {
        updateActionState('startRide', false)
      }
    }
  }
}
