import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, CheckCircle2, KeyRound, LoaderCircle, MapPinned, RefreshCw, ShieldAlert, Timer, Trash2, FileText, LogOut, User, X } from 'lucide-react'
import { WalletConnectButton } from './WalletConnectButton'
import { BottomSheet } from './BottomSheet'
import { EarningsTab } from './ai/EarningsTab'
import { SmartMap } from './ai/SmartMap'
import { OTPModal } from './OTPModal'
import { CarFront, Banknote } from 'lucide-react'
import { PWAInstallFooter } from './PWAInstallFooter'
import { ThemeToggle } from './ThemeToggle'
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
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-3 w-[280px] sm:w-72 origin-top-right rounded-2xl bg-[#0f111a] border border-white/10 p-4 shadow-2xl z-[100]"
          >
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
          </motion.div>
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
              className="bg-[#0f111a] border border-white/10 p-6 rounded-3xl max-w-lg w-full"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{viewDoc.name}</h3>
                <button onClick={() => setViewDoc(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="bg-black/50 rounded-xl overflow-hidden flex items-center justify-center">
                {/* Check if it's a CID or base64 (for backward compatibility if needed, but here we assume CID) */}
                <img src={ipfs.getGatewayUrl(viewDoc.data)} alt={viewDoc.name} className="max-w-full max-h-64 object-contain" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

type RideHook = ReturnType<typeof useRideContract>

export function DriverDashboard({ ride, onBack }: { ride: RideHook; onBack: () => void }) {
  const activeRide = ride.focusedRide
  const { location: driverLocation } = useGeolocation()
  const { active, setActive } = useDriverContext()
  const [activeTab, setActiveTab] = useState<'rides' | 'earnings'>('rides')
  const [otpOpen, setOtpOpen] = useState(false)
  const [otp, setOtp] = useState('')
  const [rideMetadata, setRideMetadata] = useState<any>(null)
  const [isMetadataLoading, setIsMetadataLoading] = useState(false)

  useEffect(() => {
    if (activeRide?.rideId) {
      const fetchMetadata = async () => {
        try {
          setIsMetadataLoading(true)
          const cid = await ipfs.getRideMetadataCID(activeRide.rideId.toString())
          if (cid) {
            const data = await ipfs.getJSON(cid)
            setRideMetadata(data)
          } else {
            setRideMetadata(null)
          }
        } catch (e) {
          console.error('Failed to fetch ride metadata from IPFS', e)
        } finally {
          setIsMetadataLoading(false)
        }
      }
      fetchMetadata()
    } else {
      setRideMetadata(null)
    }
  }, [activeRide?.rideId])

  async function handleVerifyOtp() {
    if (!activeRide) return
    const result = await ride.startRideWithOtp(activeRide, otp)
    if (result?.canExecute) {
      setOtpOpen(false)
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
        <div className="relative z-[1000] flex shrink-0 flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-6">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-white/60 transition hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="hidden lg:flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setActiveTab('rides')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition',
                activeTab === 'rides' ? 'bg-white text-[#05060a]' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              )}
            >
              <CarFront className="h-3.5 w-3.5" /> Rides
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('earnings')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition',
                activeTab === 'earnings' ? 'bg-white text-[#05060a]' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              )}
            >
              <Banknote className="h-3.5 w-3.5" /> My Earnings
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
              <ThemeToggle />
              <DriverProfileDropdown currentTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </div>
        </div>

        {activeTab === 'rides' ? (
          <div className="mx-auto grid w-full gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-[32px] border border-white/10 p-4 sm:p-5"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/38">Driver dashboard</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">
                    Accept rides and track pickup.
                  </h2>
                </div>

              <div className="mt-5 rounded-[28px] border border-amber-300/18 bg-amber-300/10 p-4">
                <div className="flex items-start gap-3">
                  <ride.driverNotice.icon className="mt-0.5 h-5 w-5 text-amber-100" />
                  <div>
                    <p className="text-sm font-semibold text-white">{ride.driverNotice.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/58">{ride.driverNotice.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Available and accepted rides</p>
                  <p className="text-xs text-white/45">Open feed comes from app boxes and refresh polling.</p>
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
                      {ride.driverRides.map((item) => (
                        <motion.button
                          key={item.rideId.toString()}
                          type="button"
                          layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => ride.setFocusedRideId(item.rideId)}
                      className={cn(
                        'w-full rounded-[28px] border p-4 text-left transition hover:scale-[1.01]',
                        ride.focusedRideId === item.rideId
                          ? 'border-white/20 bg-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.25)]'
                          : 'border-white/8 bg-white/[0.04] hover:bg-white/[0.06]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">Ride #{item.rideId.toString()}</p>
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
                              void ride.acceptRide(item.rideId)
                            }}
                            disabled={!ride.activeAddress || ride.actionState.acceptRide}
                            className="rounded-[22px] bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-45"
                          >
                            {ride.actionState.acceptRide ? 'Accepting' : 'Accept ride'}
                          </button>
                        ) : null}

                        {item.status === RideStatus.RIDER_ASSIGNED && item.rider === ride.activeAddress ? (
                          <>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                setOtpOpen(true)
                                setOtp('')
                              }}
                              className="rounded-[22px] bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-400 px-4 py-3 text-sm font-black text-slate-950"
                            >
                              Verify customer OTP
                            </button>
                          </>
                        ) : null}

                        {item.status === RideStatus.RIDE_STARTED && item.rider === ride.activeAddress ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              void ride.endRide(item.rideId)
                            }}
                            disabled={ride.actionState.endRide}
                            className="rounded-[22px] bg-gradient-to-r from-white via-white to-slate-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-45"
                          >
                            {ride.actionState.endRide ? 'Ending ride' : 'End ride'}
                          </button>
                        ) : null}

                        {item.status === RideStatus.RIDE_COMPLETED && item.rider === ride.activeAddress ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              void ride.releasePayment(item.rideId)
                            }}
                            disabled={ride.actionState.releasePayment}
                            className="rounded-[22px] bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-45"
                          >
                            {ride.actionState.releasePayment ? 'Releasing payment' : 'Release payment'}
                          </button>
                        ) : null}
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>

                {!ride.driverRides.length ? (
                  <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-white/54">
                    No visible rides yet. Once a customer creates a ride, it will appear here after refresh polling.
                  </div>
                ) : null}
              </>
            )}
          </div>
            </motion.div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="relative h-[400px] w-full overflow-hidden rounded-[32px] border border-white/10 glass-panel">
                <SmartMap
                  pickup={mapOrigin || { label: '', lat: 0, lng: 0 }}
                  destination={mapDestination || { label: '', lat: 0, lng: 0 }}
                />
              </div>
            </div>

            {activeRide ? (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-[32px] border border-white/10 p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/38">Focused ride</p>
                    <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                      Ride #{activeRide.rideId.toString()}
                    </h3>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/72">
                    {activeRide.status}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Customer wallet</p>
                    <p className="mt-2 break-all text-sm font-medium text-white">{activeRide.customer}</p>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Fare</p>
                    <p className="mt-2 text-sm font-medium text-white">{ride.formatAlgoAmount(activeRide.fareMicroAlgos)}</p>
                  </div>
                </div>

                {isMetadataLoading ? (
                  <div className="mt-5 flex items-center gap-2 text-xs text-white/40">
                    <LoaderCircle className="h-3 w-3 animate-spin" /> Fetching rich data from IPFS...
                  </div>
                ) : rideMetadata && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-emerald-300/10 bg-emerald-300/5 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-emerald-400/60">Vehicle Requested</p>
                      <p className="mt-2 text-sm font-bold text-white">{rideMetadata.vehicleType}</p>
                    </div>
                    <div className="rounded-[24px] border border-emerald-300/10 bg-emerald-300/5 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-emerald-400/60">Global Data (IPFS)</p>
                      <p className="mt-2 text-[10px] font-mono text-emerald-400/80 truncate">CID: Available</p>
                    </div>
                  </div>
                )}

                <div className="mt-5 rounded-[28px] border border-rose-300/18 bg-rose-300/10 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-100" />
                    <p className="text-sm leading-6 text-rose-50/92">
                      OTP verification happens from the driver side, but escrow only locks when the customer payment and
                      <span className="font-semibold"> verifyOTPAndStartRide </span>
                      app call are grouped together. The UI keeps that limitation visible.
                    </p>
                  </div>
                </div>

                {activeRide.status === RideStatus.RIDER_ASSIGNED ? (
                  <div className="mt-5 rounded-[28px] border border-emerald-300/18 bg-emerald-300/10 p-4">
                    <div className="flex items-start gap-3">
                      <KeyRound className="mt-0.5 h-5 w-5 text-emerald-100" />
                      <div>
                        <p className="text-sm font-semibold text-white">Pickup OTP</p>
                        <p className="mt-1 text-sm leading-6 text-white/62">
                          Ask the customer to tell you the OTP displayed on their screen, then click "Verify customer OTP" to start the ride.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeRide.status === RideStatus.RIDE_COMPLETED && activeRide.rider === ride.activeAddress ? (
                  <div className="mt-5 rounded-[28px] border border-amber-300/18 bg-amber-300/10 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-amber-100" />
                      <div>
                        <p className="text-sm font-semibold text-white">Destination reached</p>
                        <p className="mt-1 text-sm leading-6 text-white/62">
                          Development mode assumes both customer and driver are at the destination, so payment release is now available from the driver dashboard.
                        </p>
                        <button
                          type="button"
                          onClick={() => void ride.releasePayment(activeRide.rideId)}
                          disabled={ride.actionState.releasePayment}
                          className="mt-3 rounded-[20px] bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-45"
                        >
                          {ride.actionState.releasePayment ? 'Releasing payment' : 'Release payment to driver'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                    <Timer className="h-5 w-5 text-white/54" />
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-white/35">Pickup status</p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {activeRide.status === RideStatus.REQUESTED ? 'Awaiting driver' : 'Driver assigned'}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                    <MapPinned className="h-5 w-5 text-white/54" />
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-white/35">Payment lock</p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {activeRide.paymentLocked ? 'Escrow locked' : 'Not locked yet'}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                    <CheckCircle2 className="h-5 w-5 text-white/54" />
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-white/35">Driver ownership</p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {activeRide.rider === ride.activeAddress ? 'Assigned to you' : activeRide.rider ? 'Assigned to another wallet' : 'Open ride'}
                    </p>
                  </div>
                </div>

                {ride.actionState.acceptRide || ride.actionState.endRide ? (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/72">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Processing contract action
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-[32px] border border-white/10 p-5"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 text-amber-100" />
                  <div>
                    <p className="text-lg font-semibold text-white">No focused ride selected</p>
                    <p className="mt-2 text-sm leading-6 text-white/56">
                      Refresh the feed after a customer creates a ride, then select it here to view the pickup map and driver actions.
                    </p>
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
      </BottomSheet>

      <OTPModal
        isOpen={otpOpen}
        isLoading={ride.actionState.startRide}
        otp={otp}
        onOtpChange={setOtp}
        onClose={() => setOtpOpen(false)}
        onVerify={() => void handleVerifyOtp()}
      />
    </>
  )
}
