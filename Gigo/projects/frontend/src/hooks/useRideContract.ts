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

let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
if (typeof window !== 'undefined') {
  if (window.location.hostname === 'localhost') {
    BACKEND_URL = 'http://localhost:3001'
  } else if (BACKEND_URL.includes('localhost')) {
    BACKEND_URL = 'https://gigo-dapp.onrender.com'
  }
}

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
  }: {
    method: algosdk.ABIMethod
    args: any[]
    sender: string
    feeMultiplier?: number
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
    })

    const populated = await populateAppCallResources(atc, algod)
    return populated.execute(algod, 4)
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
            vehicleType: mongoRide.vehicleType
         };
      });

      setRides(finalRides.sort((a: any, b: any) => Number(b.rideId - a.rideId)))
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      updateActionState('refresh', false)
    }
  }

  async function createRide(pickup: RideLocation, drop: RideLocation, fareMicroAlgos: bigint) {
    if (!activeAddress) throw new Error('Connect wallet first.')
    
    updateActionState('createRide', true)
    try {
      const rideId = BigInt(Date.now())

      const suggestedParams = await algod.getTransactionParams().do()
      const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: algosdk.getApplicationAddress(Number(algorandConfig.appId)),
        amount: Number(fareMicroAlgos),
        assetIndex: 763011769,
        suggestedParams,
      })

      // Pass paymentTxn as the first argument (axfer)
      await executeMethod({
        method: rideAbiMethods.init_escrow,
        args: [paymentTxn, rideId],
        sender: activeAddress,
      })

      await axios.post(`${BACKEND_URL}/api/rides/create`, {
         rideId: rideId.toString(),
         customer: activeAddress,
         pickup,
         drop,
         fareMicroAlgos: fareMicroAlgos.toString(),
         vehicleType: selectedVehicle.name,
         status: RideStatus.REQUESTED,
         paymentLocked: true
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
      await executeMethod({
        method: rideAbiMethods.payout,
        args: [rideId, riderAddress],
        sender: activeAddress,
        feeMultiplier: 2,
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

  function generateOtp() { return String(Math.floor(1000 + Math.random() * 9000)) }
  function updateDestinationInput(v: string) { setDestinationInput(v) }
  function commitDestination(v: string) { setSelectedDestination(destinationOptions.find(d => d.label === v) || { label: v, lat: 0, lng: 0 }) }

  const refreshRidesEvent = useEffectEvent(() => { void refreshRides() })
  useEffect(() => {
    refreshRidesEvent()
    const interval = window.setInterval(refreshRidesEvent, 30000)
    return () => window.clearInterval(interval)
  }, [])

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
    refreshRides,
    checkAsaBalance,
    optInToAsa,
    generateOtp,
    toasts,
    dismissToast,
    focusedRide,
    focusedRideId,
    setFocusedRideId,
    clearHistory: () => {
      setRides([])
    },
    acceptRide: async (rideId: bigint) => {
      updateActionState('acceptRide', true)
      try {
        await axios.post(`${BACKEND_URL}/api/rides/update-status`, {
           rideId: rideId.toString(),
           status: RideStatus.RIDER_ASSIGNED,
           rider: activeAddress
        });
        await refreshRides()
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
        const response = await axios.post(`${BACKEND_URL}/api/rides/end-ride`, {
          rideId: rideId.toString(),
          driverAddress: activeAddress,
          driverLat: driverLocation.lat,
          driverLng: driverLocation.lng,
        })
        if (response.data?.payoutTxId) {
          pushToast({
            tone: 'success',
            title: '💰 Payment Released!',
            description: `GIGC sent to your wallet! TxID: ${response.data.payoutTxId.slice(0, 12)}...`,
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
    },
  }
}
