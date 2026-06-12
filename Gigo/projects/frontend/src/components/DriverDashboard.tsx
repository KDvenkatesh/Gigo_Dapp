import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, CheckCircle2, KeyRound, LoaderCircle, MapPinned, RefreshCw, Timer, Trash2, FileText, LogOut, User, X, ShieldCheck, Zap } from 'lucide-react'
import { WalletConnectButton } from './WalletConnectButton'
import { BottomSheet } from './BottomSheet'
import { EarningsTab } from './ai/EarningsTab'
import { SmartMap } from './ai/SmartMap'
import { OTPModal } from './OTPModal'
import { CarFront, Banknote } from 'lucide-react'
import { PWAInstallFooter } from './PWAInstallFooter'
import { Web3ReceiptModal } from './Web3ReceiptModal'

import { cn } from '../lib/cn'
import { RideStatus } from '../types/ride'
import type { useRideContract } from '../hooks/useRideContract'
import { useState, useEffect } from 'react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useDriverContext } from '../contexts/DriverContext'
import { useWallet } from '@txnlab/use-wallet-react'
import { ipfs } from '../lib/ipfs'

function DriverProfileDropdown({
   currentTab,
   onTabChange
}: {
   currentTab?: string,
   onTabChange?: (tab: 'rides' | 'earnings') => void
}) {
  const { activeAddress, activeWallet } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [documents, setDocuments] = useState<Record<string, string>>({})
  const [viewDoc, setViewDoc] = useState<{name: string, data: string} | null>(null)

  useEffect(() => {
    if (activeAddress) {
      const fetchDocs = async () => {
        try {
          const cid = await ipfs.getDriverMetadataCID(activeAddress);
          if (cid) {
            const data = await ipfs.getJSON(cid);
            if (data?.documents) {
              setDocuments(data.documents);
            }
          }
        } catch (e) {
          console.error('Failed to fetch driver docs from IPFS', e);
        }
      };
      fetchDocs();
    }
  }, [activeAddress])

  if (!activeAddress) return <WalletConnectButton />

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.3)] overflow-hidden"
      >
        {documents['Profile Photo'] ? (
          <img src={ipfs.getGatewayUrl(documents['Profile Photo'])} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <User className="w-5 h-5 text-emerald-400" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="absolute right-0 top-full mt-3 w-[280px] sm:w-72 origin-top-right z-[100] pointer-events-auto">
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="w-full bg-white rounded-3xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] border border-slate-200 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4 p-2 bg-white/5 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center overflow-hidden">
                    {documents['Profile Photo'] ? (
                      <img src={ipfs.getGatewayUrl(documents['Profile Photo'])} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">Wallet</p>
                    <p className="text-sm font-mono truncate">{activeAddress}</p>
                  </div>
                </div>

                {/* Mobile Tabs */}
                {onTabChange && (
                   <div className="lg:hidden mb-4 border-b border-white/10 pb-4">
                      <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-2 px-1">Navigation</p>
                      <div className="space-y-1">
                         <button onClick={() => { setIsOpen(false); onTabChange('rides') }} className={cn("w-full flex items-center gap-3 p-2.5 rounded-xl transition text-left", currentTab === 'rides' ? "bg-white/10 text-white" : "bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white")}>
                            <CarFront className="w-4 h-4" />
                            <span className="text-sm font-medium">Rides</span>
                         </button>
                         <button onClick={() => { setIsOpen(false); onTabChange('earnings') }} className={cn("w-full flex items-center gap-3 p-2.5 rounded-xl transition text-left", currentTab === 'earnings' ? "bg-white/10 text-white" : "bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white")}>
                            <Banknote className="w-4 h-4" />
                            <span className="text-sm font-medium">My Earnings</span>
                         </button>
                      </div>
                   </div>
                )}

                <div className="mb-4">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2">Your Documents</p>
                  <div className="space-y-2">
                    {Object.keys(documents).length > 0 ? Object.keys(documents).map(doc => (
                      <div key={doc} onClick={() => setViewDoc({name: doc, data: documents[doc]})} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition border border-transparent hover:border-white/10">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm">{doc}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-white/40">No documents found</p>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => activeWallet?.disconnect()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition font-semibold text-sm"
                >
                  <LogOut className="w-4 h-4" /> Disconnect
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setViewDoc(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass-container glass-container--rounded glass-container--large shadow-2xl"
            >
              <div className="glass-filter" style={{ backdropFilter: 'blur(24px) saturate(130%)' }}></div>
              <div className="glass-overlay"></div>
              <div className="glass-specular"></div>
              <div className="glass-content p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">{viewDoc.name}</h3>
                  <button onClick={() => setViewDoc(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/70 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="bg-black/50 rounded-xl overflow-hidden flex items-center justify-center border border-white/5">
                  <img src={ipfs.getGatewayUrl(viewDoc.data)} alt={viewDoc.name} className="max-w-full max-h-64 object-contain" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

type RideHook = ReturnType<typeof useRideContract>

// Haversine distance in km between two lat/lng points
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function WaitTimerDisplay({ driverArrivalAt, waitTimeFee }: { driverArrivalAt: string, waitTimeFee?: number }) {
   const [timerString, setTimerString] = useState('')

   useEffect(() => {
      const updateTimer = () => {
         const arrivedAt = new Date(driverArrivalAt).getTime()
         const now = Date.now()
         const elapsedMs = now - arrivedAt
         const totalSecs = Math.floor(elapsedMs / 1000)
         const limitSecs = 3 * 60
         
         if (totalSecs < limitSecs) {
            const remaining = limitSecs - totalSecs
            const m = Math.floor(remaining / 60)
            const s = remaining % 60
            setTimerString(`Grace period: ${m}:${s.toString().padStart(2, '0')} remaining`)
         } else {
            const extra = totalSecs - limitSecs
            const m = Math.floor(extra / 60)
            const s = extra % 60
            setTimerString(`Wait fee active: +${m}:${s.toString().padStart(2, '0')}`)
         }
      }
      updateTimer()
      const interval = setInterval(updateTimer, 1000)
      return () => clearInterval(interval)
   }, [driverArrivalAt])

   return (
      <div className="mt-3 mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
         <p className="font-bold text-amber-400">Wait Timer Started</p>
         {timerString && <p className="text-amber-300 font-mono mt-1">{timerString}</p>}
         <p className="text-amber-400/80 mt-1">
            {waitTimeFee ? `Current Wait Fee: ${waitTimeFee} GIGC` : "3-minute grace period active. Fee will accumulate afterwards."}
         </p>
      </div>
   )
}

export function DriverDashboard({ ride, onBack }: { ride: RideHook; onBack: () => void }) {
  const activeRide = ride.focusedRide
  const { location: driverLocation, locationError: gpsError } = useGeolocation()
  const { active, setActive, vehicleType } = useDriverContext()
  const [activeTab, setActiveTab] = useState<'rides' | 'earnings'>('rides')
  const [otpOpen, setOtpOpen] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [endRideError, setEndRideError] = useState<string | null>(null)
  const [selectedReceiptRide, setSelectedReceiptRide] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);
  
  const filteredRides = ride.driverRides.filter((item: any) => {
   const isMyRide = item.rider === ride.activeAddress;
    
    if (!active && !isMyRide) return false;
    
    if (!isMyRide) {
      if (vehicleType && item.vehicleType) {
        return item.vehicleType.toLowerCase() === vehicleType.toLowerCase();
      }
    }
    return true;
  });



  useEffect(() => {
    if (activeRide?.customerPressedImHere) {
       ride.pushToast({
          tone: 'success',
          title: 'Customer Ready',
          description: `The customer has indicated they are at the pickup point!`,
       })
    }
  }, [activeRide?.customerPressedImHere])

  // Metadata is now fetched automatically via MongoDB in useRideContract

  async function handleVerifyOtp() {
    if (!activeRide) return
    setOtpError('')
    
    try {
      const result = await ride.startRideWithOtp(activeRide, otp)
      if (result?.canExecute) {
        setOtpOpen(false)
        setOtp('')
      } else {
        setOtpError(result?.reason || 'Invalid OTP. Please try again.')
      }
    } catch (e: any) {
      setOtpError(e?.message || 'Verification failed');
    }
  }

  // Dynamic map logic:
  // 1. If RIDER_ASSIGNED: show route from Driver -> Pickup
  // 2. If RIDE_STARTED: show route from Driver -> Drop
  // 3. Otherwise: show Pickup and Drop
  const mapOrigin = activeRide?.status === RideStatus.RIDER_ASSIGNED ? driverLocation : (activeRide?.status === RideStatus.RIDE_STARTED ? driverLocation : activeRide?.pickup)
  const mapDestination = activeRide?.status === RideStatus.RIDER_ASSIGNED ? activeRide.pickup : activeRide?.drop

  return (
    <>
      <BottomSheet>
        {/* Top nav bar matching Customer Dashboard style */}
        <div className="relative z-[1000] flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6 mb-6 bg-transparent">
          <div className="glass-filter" style={{ backdropFilter: 'blur(20px) saturate(120%)' }}></div>
          <div className="glass-overlay"></div>
          <div className="glass-specular" style={{ border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}></div>
          <div className="glass-content flex items-center justify-between w-full gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-white/60 transition hover:bg-white/[0.06]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar py-1">
              <button
                type="button"
                onClick={() => setActiveTab('rides')}
                className={cn(
                  'transition-all',
                  activeTab === 'rides' ? 'glass-container glass-container--rounded text-white shadow-sm' : 'flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-bold text-white/50 hover:text-white/85 hover:bg-white/[0.04]'
                )}
              >
                {activeTab === 'rides' ? (
                   <>
                      <div className="glass-filter"></div>
                      <div className="glass-overlay"></div>
                      <div className="glass-specular"></div>
                      <div className="glass-content flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-bold">
                         <CarFront className="h-3.5 w-3.5" /> Rides
                      </div>
                   </>
                ) : (
                   <>
                      <CarFront className="h-3.5 w-3.5" /> Rides
                   </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('earnings')}
                className={cn(
                  'transition-all',
                  activeTab === 'earnings' ? 'glass-container glass-container--rounded text-white shadow-sm' : 'flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-bold text-white/50 hover:text-white/85 hover:bg-white/[0.04]'
                )}
              >
                {activeTab === 'earnings' ? (
                   <>
                      <div className="glass-filter"></div>
                      <div className="glass-overlay"></div>
                      <div className="glass-specular"></div>
                      <div className="glass-content flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-bold">
                         <Banknote className="h-3.5 w-3.5" /> My Earnings
                      </div>
                   </>
                ) : (
                   <>
                      <Banknote className="h-3.5 w-3.5" /> My Earnings
                   </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                <span className="text-xs font-medium text-white/60">Status:</span>
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none",
                    active ? "bg-emerald-500" : "bg-white/20"
                  )}
                >
                  <span className="sr-only">Toggle online status</span>
                  <span
                    className={cn(
                      "pointer-events-none absolute left-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      active ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
                <span className={cn("text-xs font-bold", active ? "text-emerald-400" : "text-white/40")}>
                  {active ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center gap-2">

                <DriverProfileDropdown currentTab={activeTab} onTabChange={setActiveTab} />
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'rides' ? (
          <div className="mx-auto grid w-full gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-container glass-container--rounded glass-container--large"
              >
                <div className="glass-filter"></div>
                <div className="glass-overlay"></div>
                <div className="glass-specular"></div>
                <div className="glass-content p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/38">Rider dashboard</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">
                    Accept rides and track pickup.
                  </h2>
                </div>



              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Available and accepted rides</p>
                  <p className="text-xs text-white/45">Find new ride requests here.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => ride.clearHistory()}
                    className="rounded-full border border-white/10 bg-white/6 p-2 text-white/72 transition hover:bg-rose-500/20 hover:text-rose-400"
                    title="Clear history"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void ride.refreshRides()}
                    className="rounded-full border border-white/10 bg-white/6 p-2 text-white/72 transition hover:bg-white/10"
                  >
                    <RefreshCw className={cn('h-4 w-4', ride.actionState.refresh && 'animate-spin')} />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {!active ? (
                  <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                    <p className="text-sm font-semibold text-white/54 mb-2">You are currently offline</p>
                    <p className="text-xs text-white/40">Toggle your status to online in the top menu to start receiving ride requests.</p>
                  </div>
                ) : (
                  <>
                    <AnimatePresence initial={false}>
                      {filteredRides.map((item) => (
                        <motion.div
                          key={item.rideId.toString()}
                          layout
                          role="button"
                          tabIndex={0}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={() => ride.setFocusedRideId(item.rideId)}
                          className={cn(
                            'w-full text-left transition-all active:scale-[0.99] cursor-pointer glass-container glass-container--rounded block',
                            ride.focusedRideId === item.rideId
                               ? 'bg-white/[0.14] border-white/30 shadow-[0_8px_24px_rgba(255,255,255,0.04)]'
                               : 'bg-white/[0.05] border-white/10 opacity-70 hover:opacity-100',
                          )}
                        >
                          <div className="glass-filter"></div>
                          <div className="glass-overlay"></div>
                          <div className="glass-specular"></div>
                          <div className="glass-content p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white">Ride #{item.rideId.toString()}</p>
                            {(item.isSurge || (item.weatherMultiplier && item.weatherMultiplier > 1.0) || (item.trafficDelayFee && Number(item.trafficDelayFee) > 0)) && (
                               <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-bold text-amber-400 uppercase tracking-wider">
                                  <Zap className="h-2.5 w-2.5" /> Surge
                               </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-white/48">{item.pickup.label} to {item.drop.label}</p>
                        </div>
                        <div className="shrink-0 rounded-full border border-white/8 bg-black/20 px-3 py-1 text-xs font-semibold text-white/72">
                          {item.status}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {item.status === RideStatus.REQUESTED ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              ride.setFocusedRideId(item.rideId)
                              void ride.acceptRide(item.rideId)
                            }}
                            disabled={!ride.activeAddress || ride.actionState.acceptRide || ride.actionState.optIn}
                            className="clay-btn clay-btn-success text-sm py-2.5 px-5 disabled:opacity-45"
                          >
                            {ride.actionState.optIn ? 'Opting in...' : ride.actionState.acceptRide ? 'Accepting' : 'Accept Ride'}
                          </button>
                        ) : null}

                        {(item.status === RideStatus.RIDER_ASSIGNED || item.status === RideStatus.DRIVER_ARRIVED) && item.rider === ride.activeAddress ? (
                          <>
                            {!item.driverArrivalAt ? (
                               <button
                                 type="button"
                                 onClick={async (event) => {
                                   event.stopPropagation()
                                 let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                                   await fetch(`${BACKEND_URL}/api/rides/update-status`, {
                                     method: 'POST',
                                     headers: { 'Content-Type': 'application/json' },
                                     body: JSON.stringify({
                                        rideId: item.rideId.toString(),
                                        status: 'DRIVER_ARRIVED'
                                     })
                                   })
                                   ride.refreshRides()
                                 }}
                                 className="clay-btn clay-btn-success text-sm px-5 py-2.5"
                               >
                                 I've Arrived
                               </button>
                            ) : (
                               <button
                                 type="button"
                                 onClick={(event) => {
                                   event.stopPropagation()
                                   ride.setFocusedRideId(item.rideId)
                                   setOtpOpen(true)
                                   setOtp('')
                                   setOtpError('')
                                 }}
                                 className="clay-btn clay-btn-brand text-sm px-5 py-2.5"
                               >
                                 Verify customer OTP
                               </button>
                            )}
                          </>
                        ) : null}

                        {item.status === RideStatus.RIDE_STARTED && item.rider === ride.activeAddress ? (
                          <button
                            type="button"
                            onClick={async (event) => {
                              event.stopPropagation()
                              ride.setFocusedRideId(item.rideId)
                              setEndRideError(null)
                              try {
                                await ride.endRide(item.rideId, driverLocation ?? undefined)
                              } catch (e: any) {
                                const msg = e?.response?.data?.error || e?.message || 'Failed to end ride'
                                setEndRideError(msg)
                              }
                            }}
                            disabled={ride.actionState.endRide}
                            className="clay-btn clay-btn-brand text-sm px-5 py-2.5 disabled:opacity-45"
                          >
                            {ride.actionState.endRide ? '⏳ Processing...' : '📍 End ride & request payment'}
                          </button>
                        ) : null}

                        {item.status === RideStatus.DROPPED_OFF && item.rider === ride.activeAddress ? (
                          <div className="rounded-[22px] bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-400 border border-indigo-500/20">
                            Waiting for customer to confirm payment...
                          </div>
                        ) : null}

                        {item.status === RideStatus.RIDE_COMPLETED && item.rider === ride.activeAddress ? (
                          <div className="rounded-[22px] bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 border border-emerald-500/20">
                            🎉 Payment successfully released to wallet!
                          </div>
                        ) : null}
                      </div>

                      {/* inline notices for driver on list card */}
                      {(item.customerPressedImHere || item.driverArrivalAt) && (item.status === RideStatus.RIDER_ASSIGNED || item.status === RideStatus.DRIVER_ARRIVED) && (
                         <div className="mt-3 flex flex-col">
                           {item.customerPressedImHere && (
                              <div className="mb-2 rounded-xl border border-sky-500/30 bg-sky-500/20 px-3 py-2 text-xs font-bold text-sky-400">
                                 👋 Customer says they are here!
                              </div>
                           )}
                           {item.driverArrivalAt && (
                              <WaitTimerDisplay driverArrivalAt={item.driverArrivalAt} waitTimeFee={Number(item.waitTimeFee)} />
                           )}
                         </div>
                      )}

                      {(item as any).receiptHash && (
                         <div className="w-full mt-2 border-t border-white/10 pt-3">
                            <button 
                               onClick={(e) => { e.stopPropagation(); setSelectedReceiptRide(item) }}
                               className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition"
                            >
                               <ShieldCheck className="h-3.5 w-3.5" />
                               View Web3 Receipt (Immutable Hash)
                            </button>
                         </div>
                      )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {!filteredRides.length ? (
                  <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-white/54">
                    No visible rides yet. Once a customer creates a {vehicleType || 'ride'}, it will appear here after refresh polling.
                  </div>
                ) : null}
              </>
            )}
            </div>
          </div>
            </motion.div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="relative h-[400px] w-full overflow-hidden rounded-[32px] border border-white/10 glass-container glass-container--rounded">
                <div className="glass-filter"></div>
                <div className="glass-overlay"></div>
                <div className="glass-specular"></div>
                <div className="glass-content">
                  <SmartMap
                    pickup={mapOrigin || { label: '', lat: 0, lng: 0 }}
                    destination={mapDestination || { label: '', lat: 0, lng: 0 }}
                  />
                </div>
              </div>
            </div>

            {activeRide ? (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-container glass-container--rounded glass-container--large shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
              >
                <div className="glass-filter" style={{ backdropFilter: 'blur(24px) saturate(130%)' }}></div>
                <div className="glass-overlay"></div>
                <div className="glass-specular"></div>
                <div className="glass-content p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/38">Focused ride</p>
                    <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                      Ride #{activeRide.rideId.toString()}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {(activeRide as any).driverReputation !== undefined && (
                      <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                        ⭐ {(activeRide as any).driverReputation}/5
                      </div>
                    )}
                    <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/72">
                      {activeRide.status}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="clay-card clay-card-lavender">
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Customer Wallet</p>
                    <p className="mt-2 break-all text-xs font-bold text-current font-mono">{activeRide.customer}</p>
                  </div>
                  <div className="clay-card clay-card-sky">
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Fare</p>
                    <p className="mt-2 text-base font-black text-current">{ride.formatAlgoAmount(activeRide.fareMicroAlgos)}</p>
                  </div>
                </div>

                {activeRide.vehicleType && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="clay-card clay-card-lavender">
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Pickup Point</p>
                      <p className="mt-2 text-xs font-bold text-current truncate">{activeRide.pickup.label}</p>
                    </div>
                    <div className="clay-card clay-card-sky">
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Drop Point</p>
                      <p className="mt-2 text-xs font-bold text-current truncate">{activeRide.drop.label}</p>
                    </div>
                  </div>
                )}



                {activeRide.status === RideStatus.RIDER_ASSIGNED || activeRide.status === RideStatus.DRIVER_ARRIVED ? (() => {
                  const hasArrived = activeRide.status === RideStatus.DRIVER_ARRIVED;
                  const arrivedAt = hasArrived && activeRide.driverArrivalAt ? new Date(activeRide.driverArrivalAt).getTime() : 0;
                  const canNoShow = arrivedAt > 0 && (currentTime - arrivedAt >= 10 * 60 * 1000);
                  
                  return (
                    <div className="mt-5 rounded-[28px] border border-emerald-300/18 bg-emerald-300/10 p-4">
                      <div className="flex items-start gap-3">
                        <KeyRound className="mt-0.5 h-5 w-5 text-emerald-100" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">Pickup Location & OTP</p>

                          {activeRide.customerPressedImHere && (
                             <div className="mt-3 mb-3 rounded-xl border border-sky-500/30 bg-sky-500/20 px-3 py-2 text-xs font-bold text-white-400">
                                👋 Customer says they are here!
                             </div>
                          )}

                          {activeRide.driverArrivalAt && (
                             <WaitTimerDisplay driverArrivalAt={activeRide.driverArrivalAt} waitTimeFee={Number(activeRide.waitTimeFee)} />
                          )}

                          <p className="mt-1 text-sm leading-6 text-white/62">
                            Ask the customer to tell you the OTP displayed on their screen, then click "Verify customer OTP" to start the ride.
                          </p>
                          
                          <div className="mt-4 flex flex-col gap-3">
                            <button
                              type="button"
                              onClick={() => setOtpOpen(true)}
                              className="w-full clay-btn py-3 text-sm font-bold shadow-[0_4px_20px_rgba(16,185,129,0.3)] bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                              🔑 Verify Customer OTP
                            </button>
                            
                            {hasArrived && (
                              <button
                                type="button"
                                disabled={!canNoShow || ride.actionState.endRide}
                                onClick={async () => {
                                  await ride.reportCustomerNoShow(activeRide.rideId);
                                }}
                                className="w-full rounded-2xl py-3 text-sm font-bold border transition disabled:opacity-50 disabled:cursor-not-allowed border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              >
                                {canNoShow ? '⚠️ Customer No-Show (Claim Fare)' : '⏳ Wait 10 mins for Customer No-Show'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })() : null}

                {activeRide.status === RideStatus.RIDE_STARTED && activeRide.rider === ride.activeAddress ? (() => {
                  const dropLat = activeRide.drop?.lat
                  const dropLng = activeRide.drop?.lng
                  const distKm = (dropLat != null && dropLng != null && driverLocation)
                    ? haversineKm(driverLocation.lat, driverLocation.lng, dropLat, dropLng)
                    : null
                  const isNear = distKm !== null && distKm <= 0.5

                  return (
                    <div className="mt-5 rounded-[28px] border border-blue-300/18 bg-blue-300/10 p-4">
                      <div className="flex items-start gap-3">
                        <MapPinned className="mt-0.5 h-5 w-5 text-blue-300 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">Ride in Progress</p>

                          {/* Live GPS distance indicator */}
                          {distKm !== null ? (
                            <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border ${
                              isNear
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                : 'bg-red-500/20 border-red-500/30 text-red-400'
                            }`}>
                              {isNear ? '✅' : '📍'} {distKm < 1 ? `${(distKm * 1000).toFixed(0)} m` : `${distKm.toFixed(2)} km`} from drop point
                              {isNear ? ' — You have arrived!' : ' remaining'}
                            </div>
                          ) : (
                            <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border bg-amber-500/20 border-amber-500/30 text-amber-400">
                              📡 Acquiring GPS...
                            </div>
                          )}

                          {/* GPS unavailable warning */}
                          {gpsError && (
                            <p className="mt-2 text-xs text-amber-400">⚠️ {gpsError}</p>
                          )}

                          {/* Distance UI removed*/}

                          {/* Backend / network error display */}
                          {endRideError && (
                            <div className="mt-3 rounded-[16px] border border-red-500/30 bg-red-500/10 px-4 py-3">
                              <p className="text-sm font-bold text-red-400">❌ Could not end ride</p>
                              <p className="mt-1 text-xs text-red-300/80">{endRideError}</p>
                              <button
                                type="button"
                                onClick={() => setEndRideError(null)}
                                className="mt-2 text-xs text-red-400 underline"
                              >Dismiss</button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={async () => {
                              setEndRideError(null)
                              try {
                                await ride.endRide(activeRide.rideId, driverLocation ?? undefined)
                              } catch (e: any) {
                                const msg = e?.response?.data?.error || e?.message || 'Failed to end ride'
                                setEndRideError(msg)
                              }
                            }}
                            disabled={ride.actionState.endRide}
                            className={cn(
                              "w-full clay-btn py-3 text-sm font-bold disabled:opacity-45 mt-4",
                              "clay-btn-brand shadow-[0_4px_24px_rgba(59,130,246,0.35)]"
                            )}
                          >
                            {ride.actionState.endRide ? '⏳ Processing drop-off...' : '✅ End ride & request payment'}
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                               try {
                                 let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                                 await fetch(`${BACKEND_URL}/api/rides/driver-cancel`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                       rideId: activeRide.rideId.toString(),
                                       reason: 'Driver cancellation',
                                       currentLat: driverLocation?.lat,
                                       currentLng: driverLocation?.lng
                                    })
                                 })
                                 await ride.refreshRides()
                               } catch (e) {
                                 console.error(e)
                               }
                            }}
                            className="w-full mt-3 rounded-2xl bg-rose-500/10 py-3 text-sm font-bold text-rose-400 hover:bg-rose-500/20 transition border border-rose-500/20"
                          >
                            🚫 Cancel Ride
                          </button>

                          {!isNear && distKm !== null && (
                            <p className="mt-2 text-center text-xs text-white/40">Button is enabled but payment will be rejected until you reach the drop point</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })() : null}

                {activeRide.status === RideStatus.DROPPED_OFF && activeRide.rider === ride.activeAddress ? (
                  <div className="mt-5 rounded-[28px] border border-indigo-300/18 bg-indigo-300/10 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-indigo-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">Ride Ended — Waiting for Payment</p>
                        <p className="mt-1 text-sm leading-6 text-black">
                          You have marked the ride as ended. Waiting for the customer to confirm and release the escrow.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeRide.status === RideStatus.RIDE_COMPLETED && activeRide.rider === ride.activeAddress ? (
                  <div className="mt-5 rounded-[28px] border border-emerald-300/18 bg-emerald-300/10 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">🎉 Ride Complete — Payment Sent!</p>
                        <p className="mt-1 text-sm leading-6 text-black">
                          Customer Confirmed .The GIGC fare has been automatically released to your wallet from the escrow. Check your wallet balance!
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="clay-card clay-card-lavender flex flex-col justify-between">
                    <Timer className="h-5 w-5 text-current opacity-70" />
                    <div className="mt-4">
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Pickup Status</p>
                      <p className="mt-1 text-xs font-bold text-current">
                        {activeRide.status === RideStatus.REQUESTED ? 'Awaiting Rider' : 'Rider Assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="clay-card clay-card-sky flex flex-col justify-between">
                    <MapPinned className="h-5 w-5 text-current opacity-70" />
                    <div className="mt-4">
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Payment Lock</p>
                      <p className="mt-1 text-xs font-bold text-current">
                        {activeRide.paymentLocked ? 'Escrow Locked' : 'Not Locked'}
                      </p>
                    </div>
                  </div>
                  <div className="clay-card clay-card-mint flex flex-col justify-between">
                    <CheckCircle2 className="h-5 w-5 text-current opacity-70" />
                    <div className="mt-4">
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Rider Ownership</p>
                      <p className="mt-1 text-xs font-bold text-current truncate">
                        {activeRide.rider === ride.activeAddress ? 'Assigned to You' : activeRide.rider ? 'Assigned to Other' : 'Open Ride'}
                      </p>
                    </div>
                  </div>
                </div>

                {ride.actionState.acceptRide || ride.actionState.endRide ? (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/72 font-bold">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Processing contract action
                  </div>
                ) : null}
              </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-container glass-container--rounded glass-container--large rounded-[32px] border border-white/10"
              >
                <div className="glass-filter"></div>
                <div className="glass-overlay"></div>
                <div className="glass-specular"></div>
                <div className="glass-content p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 text-amber-100" />
                  <div>
                    <p className="text-lg font-semibold text-white">No focused ride selected</p>
                    <p className="mt-2 text-sm leading-6 text-black">
                      Refresh the feed after a customer creates a ride, then select it here to view the pickup map and driver actions.
                    </p>
                  </div>
                </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
        ) : (
          <EarningsTab ride={ride} />
        )}
        <PWAInstallFooter />
        
        {selectedReceiptRide && (
           <Web3ReceiptModal ride={selectedReceiptRide} onClose={() => setSelectedReceiptRide(null)} />
        )}

      </BottomSheet>

      <OTPModal
        isOpen={otpOpen}
        isLoading={ride.actionState.startRide}
        otp={otp}
        error={otpError}
        onOtpChange={(val) => {
           setOtp(val)
           if (otpError) setOtpError('')
        }}
        onClose={() => setOtpOpen(false)}
        onVerify={() => void handleVerifyOtp()}
      />
    </>
  )
}
