import { populateAppCallResources } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { CheckCircle2, CircleAlert, ShieldAlert } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { algorandConfig } from '../config/algorand'
import { destinationOptions, vehicleOptions } from '../data/mockRide'
import { rideAbiMethods } from '../contracts/rideAbi'
import { decodeRideLocation, deriveLocationFromLabel, encodeRideLocation, formatAlgoAmount, toUtf8Bytes } from '../lib/location'
import { RideStatus, type ContractNotice, type RideLocation, type RideRecord, type ToastMessage } from '../types/ride'

type RideActionState = {
  createRide: boolean
  acceptRide: boolean
  storeOtp: boolean
  startRide: boolean
  endRide: boolean
  releasePayment: boolean
  refresh: boolean
}

function createToast(input: Omit<ToastMessage, 'id'>): ToastMessage {
  return { id: crypto.randomUUID(), ...input }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : 'Unknown contract error'
}

function getFriendlyErrorMessage(error: unknown, appAddress?: string) {
  const message = getErrorMessage(error)

  if (message.includes('balance') && message.includes('below min')) {
    if (appAddress && message.includes(appAddress)) {
      return `The smart contract account ${appAddress} does not have enough ALGO to cover minimum balance and box storage. Fund that app account on TestNet, then try createRide again.`
    }

    return 'The signing account does not have enough ALGO to stay above minimum balance after this transaction. Fund the wallet and try again.'
  }

  return message
}

function uint64FromBytes(value: Uint8Array) {
  const view = new DataView(value.buffer, value.byteOffset, value.byteLength)
  return view.getBigUint64(0, false)
}

function parseRideIdFromBox(name: Uint8Array) {
  return uint64FromBytes(name.slice(3))
}

function toBuffer(bytes: Uint8Array) {
  return Buffer.from(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
}

function decodeMaybeBase64(value: string | Uint8Array) {
  return typeof value === 'string' ? Uint8Array.from(Buffer.from(value, 'base64')) : new Uint8Array(value)
}

const ZERO_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HQC7V'

export function useRideContract() {
  const { activeAddress, activeWallet, transactionSigner } = useWallet()
  const algod = useMemo(
    () => new algosdk.Algodv2(algorandConfig.algodToken, algorandConfig.algodServer, algorandConfig.algodPort),
    [],
  )
  const appAddress = useMemo(
    () => (algorandConfig.appId ? algosdk.getApplicationAddress(Number(algorandConfig.appId)).toString() : null),
    [],
  )
  const [rides, setRides] = useState<RideRecord[]>([])
  const [localRides, setLocalRides] = useState<RideRecord[]>([])
  const [focusedRideId, setFocusedRideId] = useState<bigint | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicleOptions[1].id)
  const [selectedDestination, setSelectedDestination] = useState<RideLocation>(destinationOptions[0])
  const [destinationInput, setDestinationInput] = useState(destinationOptions[0].label)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [actionState, setActionState] = useState<RideActionState>({
    createRide: false,
    acceptRide: false,
    storeOtp: false,
    startRide: false,
    endRide: false,
    releasePayment: false,
    refresh: false,
  })
  const [historyCutoff, setHistoryCutoff] = useState<{ id: bigint; time: number }>(() => {
    const savedId = localStorage.getItem('ride_history_id_cutoff')
    const savedTime = localStorage.getItem('ride_history_time_cutoff')
    return {
      id: savedId ? BigInt(savedId) : -1n,
      time: savedTime ? Number(savedTime) : 0,
    }
  })
  const timersRef = useRef<number[]>([])

  const appReady = Boolean(activeAddress && algorandConfig.appId !== null)
  const selectedVehicle =
    vehicleOptions.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicleOptions[1]
  const dataSource = algorandConfig.appId ? rides : localRides
  const focusedRide = dataSource.find((ride) => ride.rideId === focusedRideId) ?? dataSource[0] ?? null

  const customerNotice: ContractNotice = {
    tone: appReady ? 'success' : 'warning',
    title: appReady ? 'Contract calls ready' : 'App ID not configured',
    description: appReady
      ? `Customer booking is ready to sign against createRide on TestNet. If createRide fails with a minimum balance error, fund the app account ${appAddress}.`
      : 'Set VITE_RIDE_APP_ID to enable real on-chain booking. Local demo booking is active until then.',
    icon: appReady ? CheckCircle2 : ShieldAlert,
  }

  const driverNotice: ContractNotice = {
    tone: 'warning',
    title: 'Important contract behavior',
    description:
      'Escrow payment is not transferred at acceptRide. It happens inside verifyOTPAndStartRide and requires a grouped customer payment plus the assigned rider app call.',
    icon: CircleAlert,
  }

  function scheduleDismiss(id: string) {
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4000)
    timersRef.current.push(timer)
  }

  function pushToast(toast: Omit<ToastMessage, 'id'>) {
    const next = createToast(toast)
    setToasts((current) => [next, ...current].slice(0, 4))
    scheduleDismiss(next.id)
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
    payment,
    feeMultiplier = 1,
  }: {
    method: algosdk.ABIMethod
    args: algosdk.ABIValue[]
    sender: string
    payment?: algosdk.Transaction
    feeMultiplier?: number
  }) {
    if (!algorandConfig.appId || !activeAddress) {
      throw new Error('Missing app configuration or active wallet address.')
    }

    if (!transactionSigner) {
      throw new Error('Wallet signer is not ready. Reconnect Pera wallet and try again.')
    }

    const params = await algod.getTransactionParams().do()
    if (feeMultiplier > 1) {
      params.fee = BigInt(1000 * feeMultiplier)
      params.flatFee = true
    }
    const atc = new algosdk.AtomicTransactionComposer()

    if (payment) {
      atc.addTransaction({ txn: payment, signer: transactionSigner })
    }

    atc.addMethodCall({
      appID: Number(algorandConfig.appId),
      method,
      methodArgs: args as algosdk.ABIArgument[],
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
      const validPrefixes = ['cu_', 'ri_', 'st_', 'pu_', 'dr_', 'fa_', 'oh_', 'pl_']
      
      const targetBoxes = boxes.boxes.filter((box: any) => {
        try {
          const name = decodeMaybeBase64(box.name)
          const prefix = new TextDecoder().decode(name.slice(0, 3))
          return validPrefixes.includes(prefix)
        } catch { return false }
      })

      // Group by rideId and only keep the latest 5 rides to avoid 429
      const rideIds = Array.from(new Set(targetBoxes.map((box: any) => parseRideIdFromBox(decodeMaybeBase64(box.name))))).sort((a, b) => Number(b - a)).slice(0, 5)
      const filteredBoxes = targetBoxes.filter((box: any) => rideIds.includes(parseRideIdFromBox(decodeMaybeBase64(box.name))))

      const CHUNK_SIZE = 1
      for (let i = 0; i < filteredBoxes.length; i += CHUNK_SIZE) {
        const chunk = filteredBoxes.slice(i, i + CHUNK_SIZE)
        await Promise.all(
          chunk.map(async (box: any) => {
            try {
              const name = decodeMaybeBase64(box.name)
              const prefix = new TextDecoder().decode(name.slice(0, 3))
              const rideId = parseRideIdFromBox(name)
              
              // Retry logic for box fetching
              let attempts = 0
              let valueResponse = null
              while (attempts < 3) {
                try {
                  await new Promise(r => setTimeout(r, attempts * 500 + 100))
                  valueResponse = await algod.getApplicationBoxByName(Number(algorandConfig.appId), toBuffer(name)).do()
                  break
                } catch (e: any) {
                  if (e.status === 429) {
                    attempts++
                    continue
                  }
                  throw e
                }
              }

              if (!valueResponse) throw new Error('Max retries reached')

              const value = decodeMaybeBase64(valueResponse.value)
              const key = rideId.toString()
              const current = rideMap.get(key) ?? { rideId }

              if (prefix === 'cu_') current.customer = algosdk.encodeAddress(value)
              if (prefix === 'ri_') {
                const addr = algosdk.encodeAddress(value)
                current.rider = (addr === ZERO_ADDRESS || !addr) ? undefined : addr
              }
              if (prefix === 'st_') current.status = new TextDecoder().decode(value) as RideRecord['status']
              if (prefix === 'pu_') current.pickup = decodeRideLocation(value)
              if (prefix === 'dr_') current.drop = decodeRideLocation(value)
              if (prefix === 'fa_') current.fareMicroAlgos = uint64FromBytes(value)
              if (prefix === 'oh_') current.otp = new TextDecoder().decode(value)
              if (prefix === 'pl_') current.paymentLocked = new TextDecoder().decode(value) === 'LOCKED'

              rideMap.set(key, current)
            } catch (e) {
              console.warn('Failed to fetch box:', box.name, e)
            }
          })
        )
        if (i + CHUNK_SIZE < filteredBoxes.length) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      const parsedRides = [...rideMap.values()]
        .filter(
          (ride): ride is RideRecord =>
            Boolean(
              ride.customer &&
              ride.pickup?.label?.trim() &&
              ride.drop?.label?.trim() &&
              ride.status &&
              ride.fareMicroAlgos !== undefined
            ),
        )
        .sort((a, b) => Number(b.rideId - a.rideId))

      setRides(parsedRides)
      setFocusedRideId((current) => current ?? parsedRides[0]?.rideId ?? null)
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'Unable to load rides',
        description: error instanceof Error ? error.message : 'Check app ID and algod access.',
      })
    } finally {
      updateActionState('refresh', false)
    }
  }

  async function createRide(pickup: RideLocation, drop: RideLocation, fareMicroAlgos: bigint) {
    if (!activeAddress) {
      throw new Error('Connect wallet first.')
    }

    if (!algorandConfig.appId) {
      const rideId = BigInt(Date.now())
      const demoRide: RideRecord = {
        rideId,
        customer: activeAddress,
        status: RideStatus.REQUESTED,
        pickup,
        drop,
        fareMicroAlgos,
        paymentLocked: false,
      }
      setLocalRides((current) => [demoRide, ...current])
      setFocusedRideId(rideId)
      pushToast({
        tone: 'success',
        title: 'Demo ride created',
        description: `Ride #${rideId.toString()} was created locally because app ID is not configured yet.`,
      })
      return rideId
    }

    updateActionState('createRide', true)
    try {
      const result = await executeMethod({
        method: rideAbiMethods.createRide,
        args: [encodeRideLocation(pickup), encodeRideLocation(drop), fareMicroAlgos],
        sender: activeAddress,
      })
      const rideId = result.methodResults[0]?.returnValue as bigint
      pushToast({
        tone: 'success',
        title: 'Ride created',
        description: `Ride #${rideId.toString()} is now in REQUESTED state.`,
      })
      await refreshRides()
      setFocusedRideId(rideId)
      return rideId
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'createRide failed',
        description: getFriendlyErrorMessage(error, appAddress ?? undefined),
      })
      throw error
    } finally {
      updateActionState('createRide', false)
    }
  }

  async function acceptRide(rideId: bigint) {
    if (!activeAddress) throw new Error('Connect wallet first.')

    if (!algorandConfig.appId) {
      setLocalRides((current) =>
        current.map((ride) =>
          ride.rideId === rideId ? { ...ride, rider: activeAddress, status: RideStatus.RIDER_ASSIGNED } : ride,
        ),
      )
      setFocusedRideId(rideId)
      pushToast({
        tone: 'success',
        title: 'Demo ride accepted',
        description: `Ride #${rideId.toString()} moved to RIDER_ASSIGNED locally.`,
      })
      return
    }

    updateActionState('acceptRide', true)
    try {
      await executeMethod({
        method: rideAbiMethods.acceptRide,
        args: [rideId],
        sender: activeAddress,
      })
      pushToast({
        tone: 'success',
        title: 'Ride accepted',
        description: `Ride #${rideId.toString()} moved to RIDER_ASSIGNED.`,
      })
      await refreshRides()
      setFocusedRideId(rideId)
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'acceptRide failed',
        description: getFriendlyErrorMessage(error, appAddress ?? undefined),
      })
      throw error
    } finally {
      updateActionState('acceptRide', false)
    }
  }

  async function endRide(rideId: bigint) {
    if (!activeAddress) throw new Error('Connect wallet first.')

    if (!algorandConfig.appId) {
      setLocalRides((current) =>
        current.map((ride) =>
          ride.rideId === rideId ? { ...ride, status: RideStatus.RIDE_COMPLETED } : ride,
        ),
      )
      pushToast({
        tone: 'success',
        title: 'Demo ride completed',
        description: `Ride #${rideId.toString()} moved to RIDE_COMPLETED locally.`,
      })
      return
    }

    updateActionState('endRide', true)
    try {
      await executeMethod({
        method: rideAbiMethods.endRide,
        args: [rideId],
        sender: activeAddress,
      })
      pushToast({
        tone: 'success',
        title: 'Ride completed',
        description: `Ride #${rideId.toString()} moved to RIDE_COMPLETED.`,
      })
      await refreshRides()
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'endRide failed',
        description: getFriendlyErrorMessage(error, appAddress ?? undefined),
      })
      throw error
    } finally {
      updateActionState('endRide', false)
    }
  }

  async function storeOtp(rideId: bigint, otp: string) {
    if (!activeAddress) throw new Error('Connect wallet first.')

    if (!algorandConfig.appId) {
      setLocalRides((current) =>
        current.map((ride) => (ride.rideId === rideId ? { ...ride, otp } : ride)),
      )
      pushToast({
        tone: 'success',
        title: 'Demo OTP stored',
        description: `OTP saved locally for ride #${rideId.toString()}.`,
      })
      return
    }

    updateActionState('storeOtp', true)
    try {
      await executeMethod({
        method: rideAbiMethods.storeOTP,
        args: [rideId, toUtf8Bytes(otp)],
        sender: activeAddress,
      })
      pushToast({
        tone: 'success',
        title: 'OTP stored',
        description: `OTP saved for ride #${rideId.toString()}. The opposite party can now use it for pickup verification.`,
      })
      await refreshRides()
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'storeOTP failed',
        description: getFriendlyErrorMessage(error, appAddress ?? undefined),
      })
      throw error
    } finally {
      updateActionState('storeOtp', false)
    }
  }

  async function releasePayment(rideId: bigint) {
    if (!activeAddress) throw new Error('Connect wallet first.')

    if (!algorandConfig.appId) {
      setLocalRides((current) =>
        current.map((ride) =>
          ride.rideId === rideId ? { ...ride, status: RideStatus.PAID, paymentLocked: false } : ride,
        ),
      )
      pushToast({
        tone: 'success',
        title: 'Demo payment released',
        description: `Ride #${rideId.toString()} moved to PAID locally.`,
      })
      return
    }

    updateActionState('releasePayment', true)
    try {
      await executeMethod({
        method: rideAbiMethods.releasePayment,
        args: [rideId],
        sender: activeAddress,
        feeMultiplier: 2,
      })
      pushToast({
        tone: 'success',
        title: 'Payment released',
        description: `Ride #${rideId.toString()} moved to PAID.`,
      })
      await refreshRides()
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'releasePayment failed',
        description: getFriendlyErrorMessage(error, appAddress ?? undefined),
      })
      throw error
    } finally {
      updateActionState('releasePayment', false)
    }
  }

  async function startRideWithOtp(ride: RideRecord, otp: string) {
    if (!activeAddress || !transactionSigner || !algorandConfig.appId) {
      if (ride.otp !== otp) {
        pushToast({
          tone: 'error',
          title: 'Incorrect OTP',
          description: 'The entered OTP does not match the customer code.',
        })
        return { canExecute: false }
      }
      setLocalRides((current) =>
        current.map((item) =>
          item.rideId === ride.rideId
            ? { ...item, status: RideStatus.RIDE_STARTED, paymentLocked: true }
            : item,
        ),
      )
      pushToast({
        tone: 'success',
        title: 'Demo ride started',
        description: `Ride #${ride.rideId.toString()} moved to RIDE_STARTED locally.`,
      })
      return { canExecute: true }
    }

    updateActionState('startRide', true)
    try {
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: ride.customer,
        receiver: algosdk.getApplicationAddress(Number(algorandConfig.appId)),
        amount: Number(ride.fareMicroAlgos),
        suggestedParams: await algod.getTransactionParams().do(),
      })

      const signerMismatch = activeAddress !== ride.customer || activeAddress !== ride.rider

      if (signerMismatch) {
        pushToast({
          tone: 'info',
          title: 'Customer signature still required',
          description:
            'OTP verification belongs to the driver, but this contract also requires the customer payment in the same group. Escrow can only lock when both signatures are coordinated.',
        })
        return { canExecute: false, otpBytes: toUtf8Bytes(otp), paymentTxn }
      }

      await executeMethod({
        method: rideAbiMethods.verifyOTPAndStartRide,
        args: [ride.rideId, toUtf8Bytes(otp)],
        sender: activeAddress,
        payment: paymentTxn,
      })
      await refreshRides()
      return { canExecute: true, otpBytes: toUtf8Bytes(otp), paymentTxn }
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'verifyOTPAndStartRide failed',
        description: getFriendlyErrorMessage(error, appAddress ?? undefined),
      })
      throw error
    } finally {
      updateActionState('startRide', false)
    }
  }

  function generateOtp() {
    return String(Math.floor(1000 + Math.random() * 9000))
  }

  function updateDestinationInput(value: string) {
    setDestinationInput(value)
  }

  function commitDestination(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return

    const matched = destinationOptions.find((option) => option.label.toLowerCase() === trimmed.toLowerCase())
    const nextDestination = matched ?? deriveLocationFromLabel(trimmed)
    setDestinationInput(nextDestination.label)
    setSelectedDestination(nextDestination)
  }

  const clearHistory = () => {
    const maxId = dataSource.reduce((max, r) => (r.rideId > max ? r.rideId : max), -1n)
    const now = Date.now()
    const keyPrefix = algorandConfig.appId ? `app_${algorandConfig.appId}` : 'demo'
    localStorage.setItem(`gh_id_${keyPrefix}`, maxId.toString())
    localStorage.setItem(`gh_time_${keyPrefix}`, now.toString())
    setHistoryCutoff({ id: maxId, time: now })

    pushToast({
      tone: 'success',
      title: 'History cleared',
      description: 'Your ride history has been reset for this session.',
    })
  }

  const filteredDataSource = useMemo(() => {
    return dataSource.filter(ride => {
      // In demo mode (no App ID), rideId is Date.now()
      if (!algorandConfig.appId) {
        return Number(ride.rideId) > historyCutoff.time
      }
      // On-chain rides use sequential IDs
      return ride.rideId > historyCutoff.id
    })
  }, [dataSource, historyCutoff, algorandConfig.appId])

  const customerRides = filteredDataSource.filter((ride) => ride.customer === activeAddress)
  const driverRides = filteredDataSource.filter((ride) => ride.rider === activeAddress || (!ride.rider && ride.status === RideStatus.REQUESTED))
  const refreshRidesEvent = useEffectEvent(() => {
    void refreshRides()
  })

  useEffect(() => {
    if (!algorandConfig.appId) return

    refreshRidesEvent()
    const interval = window.setInterval(() => {
      if (!actionState.refresh) {
        refreshRidesEvent()
      }
    }, 30000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
    },
    [],
  )

  return {
    activeAddress,
    activeWallet,
    appReady,
    appId: algorandConfig.appId,
    appAddress,
    rides: dataSource,
    customerRides,
    driverRides,
    focusedRide,
    focusedRideId,
    setFocusedRideId,
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
    acceptRide,
    endRide,
    releasePayment,
    storeOtp,
    refreshRides,
    startRideWithOtp,
    generateOtp,
    clearHistory,
    toasts,
    dismissToast,
  }
}
