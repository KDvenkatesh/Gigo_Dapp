import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Camera, CarFront, CheckCircle2, Clock3, Gem, History, Loader2, LoaderCircle, MapPin, RefreshCw, Search, ShieldCheck, Trash2, UserRound, X, Zap, Coins, Wallet } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import { WalletConnectButton } from './WalletConnectButton'
import { NFTPassCard } from './NFTPassCard'
import { BookingMap } from './BookingMap'
import { PassPurchaseModal } from './PassPurchaseModal'
import { type PassInfo } from '../hooks/useAlgorandAssets'
import { PWAInstallFooter } from './PWAInstallFooter'
import { Web3ReceiptModal } from './Web3ReceiptModal'

import algosdk from 'algosdk'
import axios from 'axios'
import { algorandConfig } from '../config/algorand'

import { PricePrediction } from './ai/PricePrediction'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAlgorandAssets, type PassTier } from '../hooks/useAlgorandAssets'
import { usePlaceSearch, reverseGeocodeLocation } from '../hooks/usePlaceSearch'
import { calculateDistanceKm } from '../lib/location'
import { cn } from '../lib/cn'
import { RideStatus, type PlaceSuggestion, type RideLocation, type AppRole, type RideRecord } from '../types/ride'
import type { useRideContract } from '../hooks/useRideContract'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ipfs } from '../lib/ipfs'

import bodaIcon from '../assets/Boda.png'
import carIcon from '../assets/Car.png'
import autoIcon from '../assets/Auto.png'

const vehicleIcons: Record<string, string> = {
  boda: bodaIcon,
  car: carIcon,
  auto: autoIcon,
}


type RideHook = ReturnType<typeof useRideContract>

export function CustomerDashboard({ ride, onBack, onSwitchRole }: { ride: RideHook; onBack: () => void; onSwitchRole: (role: AppRole) => void }) {
   const { location, isLocating, locationError } = useGeolocation()
   const passData = useAlgorandAssets()
   const [refundedTxId, setRefundedTxId] = useState<string | null>(null)
   const [tab, setTab] = useState<'book' | 'history' | 'passes'>('book')
   const [mapSelectionMode, setMapSelectionMode] = useState<'pickup' | 'drop' | null>(null)
   const [pickupInput, setPickupInput] = useState(location.label)
   const [pickupLocation, setPickupLocation] = useState<RideLocation>(location)
   const [destinationInput, setDestinationInput] = useState('')
   const [destinationLocation, setDestinationLocation] = useState<RideLocation>(ride.selectedDestination)
   const [pickupTouched, setPickupTouched] = useState(false)
   const [destinationTouched, setDestinationTouched] = useState(false)
   const [activeInput, setActiveInput] = useState<'pickup' | 'drop' | null>(null)
   const { results: pickupSuggestions, isLoading: pickupSearchLoading } = usePlaceSearch(pickupInput, pickupTouched)
   const { results: destinationSuggestions, isLoading: destinationSearchLoading } = usePlaceSearch(
      destinationInput,
      destinationTouched,
   )

    useEffect(() => {
      if (!pickupTouched) {
         setPickupInput(location.label)
         setPickupLocation(location)
      }
    }, [location, pickupTouched])

    // Refund timeout removed
    const [surgeMultipliers, setSurgeMultipliers] = useState({ weather: 1.0, traffic: 1.0 })
    const [surgeLoading, setSurgeLoading] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState<bigint | null>(null)

    const activeRide = useMemo(
       () => ride.customerRides.find(r =>
          r.status !== RideStatus.PAID && r.status !== RideStatus.RIDE_COMPLETED
       ),
       [ride.customerRides],
    )

    const [waitTimerString, setWaitTimerString] = useState('')
    const [selectedReceiptRide, setSelectedReceiptRide] = useState<RideRecord | null>(null)
    
    useEffect(() => {
       if (!activeRide?.driverArrivalAt) {
          setWaitTimerString('')
          return
       }
       const timerInterval = setInterval(() => {
          const arrivalTime = new Date(activeRide.driverArrivalAt!).getTime()
          const diff = Date.now() - arrivalTime
          const graceMs = 3 * 60 * 1000 // 3 minutes grace period
          
          if (diff <= graceMs) {
             const remaining = Math.max(0, graceMs - diff)
             const m = Math.floor(remaining / 60000)
             const s = Math.floor((remaining % 60000) / 1000)
             setWaitTimerString(`Grace Period: ${m}:${s.toString().padStart(2, '0')} remaining`)
          } else {
             const chargeableMs = diff - graceMs
             const m = Math.floor(chargeableMs / 60000)
             const s = Math.floor((chargeableMs % 60000) / 1000)
             setWaitTimerString(`Wait Fee applying (${m}:${s.toString().padStart(2, '0')})`)
          }
       }, 1000)
       return () => clearInterval(timerInterval)
    }, [activeRide?.driverArrivalAt])

    useEffect(() => {
       setDestinationInput(ride.selectedDestination.label)
       setDestinationLocation(ride.selectedDestination)
    }, [ride.selectedDestination])

    useEffect(() => {
       const fetchSurge = async () => {
          setSurgeLoading(true)
          try {
             let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
             const res = await axios.get(`${BACKEND_URL}/api/rides/estimate-surge?pickupLat=${pickupLocation.lat}&pickupLng=${pickupLocation.lng}&dropLat=${destinationLocation.lat}&dropLng=${destinationLocation.lng}`)
             setSurgeMultipliers({ weather: res.data.weatherMultiplier || 1.0, traffic: res.data.trafficMultiplier || 1.0 })
          } catch (e) {
             setSurgeMultipliers({ weather: 1.0, traffic: 1.0 })
          } finally {
             setSurgeLoading(false)
          }
       }
       if (pickupLocation && destinationLocation) {
          fetchSurge()
       }
    }, [pickupLocation.lat, pickupLocation.lng, destinationLocation.lat, destinationLocation.lng])

    const distanceKm = useMemo(
       () => calculateDistanceKm(pickupLocation, destinationLocation),
       [pickupLocation, destinationLocation],
    )
    const estimatedFare = useMemo(
       () => BigInt(Math.max(100000, Math.round(distanceKm * 1000000 * ride.selectedVehicle.multiplier * 0.18 * surgeMultipliers.weather * surgeMultipliers.traffic))),
       [distanceKm, ride.selectedVehicle.multiplier, surgeMultipliers],
    )
    const baseEstimatedFare = useMemo(
       () => BigInt(Math.max(100000, Math.round(distanceKm * 1000000 * ride.selectedVehicle.multiplier * 0.18))),
       [distanceKm, ride.selectedVehicle.multiplier],
    )
    const discountedFare = useMemo(
       () => passData.applyDiscount(estimatedFare),
       [estimatedFare, passData.applyDiscount],
    )
    const hasActivePass = Boolean(passData.activePass && passData.activePass.isActive)



   function selectPickup(suggestion: PlaceSuggestion | RideLocation) {
      setPickupTouched(true)
      setPickupInput(suggestion.label)
      setPickupLocation(suggestion)
      setActiveInput(null)
   }

   function selectDestination(suggestion: PlaceSuggestion | RideLocation) {
      setDestinationTouched(true)
      setDestinationInput(suggestion.label)
      setDestinationLocation(suggestion)
      ride.setSelectedDestination(suggestion)
      setActiveInput(null)
   }

   async function handleMapPick(coords: { lat: number; lng: number }, mode: 'pickup' | 'drop') {
      const resolved = await reverseGeocodeLocation({
         label: mode === 'pickup' ? 'Picked location' : 'Dropped location',
         lat: coords.lat,
         lng: coords.lng,
      })
      if (mode === 'pickup') selectPickup(resolved)
      else selectDestination(resolved)
      setMapSelectionMode(null)
   }

   const [showSuccess, setShowSuccess] = useState(false)
   const [showOptInPopup, setShowOptInPopup] = useState(false)

   async function handleGenerateOtp(rideId: bigint) {
      const nextOtp = ride.generateOtp()
      await ride.storeOtp(rideId, nextOtp)
     let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      fetch(`${BACKEND_URL}/api/rides/presence-event`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ rideId: rideId.toString(), event: 'OTP_VIEWED' })
      }).catch(console.error)
   }

    async function handleCreateRide() {
       try {
         if (ride.activeAddress) {
            const { optedIn } = await ride.checkAsaBalance(ride.activeAddress);
            if (!optedIn) {
               setShowOptInPopup(true);
               return;
            }
         }
          const fareToCharge = hasActivePass ? discountedFare : estimatedFare
          const isSurge = surgeMultipliers.weather > 1.0 || surgeMultipliers.traffic > 1.0;
          
          // 1. Trigger the on-chain Escrow IMMEDIATELY (Faster UX)
          const rideId = await ride.createRide(pickupLocation, destinationLocation, fareToCharge, isSurge)
          
          if (rideId) {
             setShowSuccess(true)
             setTimeout(() => setShowSuccess(false), 3000)
              let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            fetch(`${BACKEND_URL}/api/rides/presence-event`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ rideId: rideId.toString(), event: 'RIDE_SCREEN_OPENED' })
            }).catch(console.error)
             // 2. Metadata is now synced immediately inside createRide via MongoDB!
          }
       } catch (err) {
          console.error('Ride creation failed:', err)
       }
    }

   const showSuggestions = activeInput !== null && (
      (activeInput === 'pickup' && (pickupSuggestions.length > 0 || pickupSearchLoading)) ||
      (activeInput === 'drop' && (destinationSuggestions.length > 0 || destinationSearchLoading))
   )

   return (
      <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-[#05060a]">

         {/* ── Top nav bar ── */}
         <div className="relative z-[1000] flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6 bg-transparent">
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
                  {([
                     { id: 'book' as const, icon: CarFront, label: 'Book' },
                     { id: 'history' as const, icon: History, label: 'My Rides', count: ride.customerRides.length },
                     { id: 'passes' as const, icon: Gem, label: 'Your Passes' },
                  ]).map((t) => (
                     <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={cn(
                           'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[12px] font-medium transition active:scale-95',
                           tab === t.id
                              ? 'bg-white text-[#05060a]'
                              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
                        )}
                     >
                        <t.icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t.label}</span>
                        <span className="sm:hidden">{t.id === 'history' ? 'Rides' : t.label}</span>
                        {t.count && t.count > 0 ? (
                           <span className={cn(
                              'rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                              tab === t.id ? 'bg-black/10 text-black/60' : 'bg-white/10 text-white/50',
                           )}>
                              {t.count}
                           </span>
                        ) : null}
                     </button>
                  ))}
               </div>

               <div className="shrink-0 flex items-center gap-2">

                  <CustomerProfileDropdown ride={ride} onSwitchRole={onSwitchRole} currentTab={tab} onTabChange={setTab} rideCount={ride.customerRides.length} />
               </div>
            </div>
         </div>

         <AnimatePresence mode="wait">

            {/* ══════════════════════ BOOK TAB ══════════════════════ */}
            {tab === 'book' && (
               <motion.div
                  key="book"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col flex-1 min-h-0 lg:grid lg:grid-cols-[1.08fr_0.92fr] gap-5 lg:gap-8 overflow-hidden px-4 sm:px-6 pb-6 pt-3"
               >
                  {/* Map — left side on desktop, fixed height on mobile — styled same as Driver Dashboard */}
                  <div className="relative h-[260px] sm:h-[300px] lg:h-full shrink-0">
                  <div className="map-container relative h-full w-full overflow-hidden rounded-[32px] border border-white/10 glass-container glass-container--rounded">
                     <div className="glass-filter" style={{ backdropFilter: 'blur(20px) saturate(120%)' }}></div>
                     <div className="glass-overlay"></div>
                     <div className="glass-specular"></div>
                     <div className="glass-content h-full">
                     <BookingMap
                        pickup={pickupLocation}
                        drop={destinationLocation}
                        selectionMode={mapSelectionMode}
                        onPickLocation={handleMapPick}
                     />
                     {mapSelectionMode && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ zIndex: 900 }}>
                           <div className="rounded-lg bg-black/70 px-4 py-2 text-sm font-medium text-white backdrop-blur-xl" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                              Tap map to set {mapSelectionMode}
                           </div>
                        </div>
                     )}
                     {mapSelectionMode && (
                        <button type="button" onClick={() => setMapSelectionMode(null)}
                           className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xl transition hover:bg-black/90"
                           style={{ zIndex: 900 }}>
                           <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                     )}
                     {!mapSelectionMode && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2" style={{ zIndex: 900 }}>
                           <button type="button" onClick={() => setMapSelectionMode('pickup')}
                              className="flex items-center gap-2 rounded-lg bg-black/70 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-xl transition hover:bg-emerald-600/80"
                              style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-bold text-slate-950">A</span>
                              Pickup
                           </button>
                           <button type="button" onClick={() => setMapSelectionMode('drop')}
                              className="flex items-center gap-2 rounded-lg bg-black/70 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-xl transition hover:bg-blue-600/80"
                              style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-400 text-[9px] font-bold text-slate-950">B</span>
                              Drop
                           </button>
                        </div>
                     )}
                     </div>
                  </div>
                  </div>

                  {/* Booking form — always scrollable */}
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-transparent pr-1">
                     <div className="mx-auto w-full max-w-3xl space-y-5 py-3 pb-20">

                        {locationError && (
                           <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-4 text-sm text-amber-200/80">
                              {locationError}
                           </div>
                        )}

                        {/* Pickup + Destination (Glassmorphic Container) */}
                        <div className="glass-container glass-container--rounded glass-container--large mb-4">
                           <div className="glass-filter"></div>
                           <div className="glass-overlay"></div>
                           <div className="glass-specular"></div>
                           <div className="glass-content p-6 space-y-4">
                              <div
                              className={cn('flex cursor-text items-center gap-4 p-3 rounded-2xl transition', activeInput === 'pickup' ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]')}
                              onClick={() => setActiveInput('pickup')}
                           >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-slate-950 shadow-[0_0_12px_rgba(52,211,153,0.4)]">A</div>
                              <div className="flex-1 min-w-0">
                                 <span className="text-[10px] font-black uppercase tracking-wider text-white/30 block">Pickup Location</span>
                                 <input
                                    value={pickupInput}
                                    onChange={(e) => { setPickupTouched(true); setPickupInput(e.target.value) }}
                                    onFocus={() => setActiveInput('pickup')}
                                    placeholder={isLocating ? 'Detecting location\u2026' : 'Pickup location'}
                                    className="w-full bg-transparent text-sm font-bold text-white placeholder-white/30 outline-none mt-0.5"
                                 />
                              </div>
                              {pickupInput && activeInput === 'pickup' && (
                                 <button type="button" onClick={(e) => { e.stopPropagation(); setPickupInput(''); setPickupTouched(false) }}>
                                    <X className="h-4 w-4 text-white/30 hover:text-white" />
                                 </button>
                              )}
                           </div>
                           <div className="h-px bg-white/[0.06] mx-3" />
                           <div
                              className={cn('flex cursor-text items-center gap-4 p-3 rounded-2xl transition', activeInput === 'drop' ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]')}
                              onClick={() => setActiveInput('drop')}
                           >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-400 text-[10px] font-black text-slate-950 shadow-[0_0_12px_rgba(96,165,250,0.4)]">B</div>
                              <div className="flex-1 min-w-0">
                                 <span className="text-[10px] font-black uppercase tracking-wider text-white/30 block">Destination</span>
                                 <input
                                    value={destinationInput}
                                    onChange={(e) => { setDestinationTouched(true); setDestinationInput(e.target.value) }}
                                    onFocus={() => { setActiveInput('drop'); setDestinationTouched(true) }}
                                    placeholder="Where to?"
                                    className="w-full bg-transparent text-sm font-bold text-white placeholder-white/30 outline-none mt-0.5"
                                 />
                              </div>
                              {destinationInput && activeInput === 'drop' && (
                                 <button type="button" onClick={(e) => { e.stopPropagation(); setDestinationInput(''); setDestinationTouched(false) }}>
                                    <X className="h-4 w-4 text-white/30 hover:text-white" />
                                 </button>
                              )}
                           </div>

                           {showSuggestions && (
                              <div className="rounded-2xl border border-white/[0.06] bg-black/40 px-2 py-2 backdrop-blur-md">
                                 {activeInput === 'pickup' && (
                                    <>
                                       {pickupSearchLoading && (
                                          <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40">
                                             <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Searching{'\u2026'}
                                          </div>
                                       )}
                                       <button type="button" onClick={() => selectPickup(location)}
                                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04]">
                                          <div className="rounded-full bg-emerald-400/10 p-1.5 text-emerald-400"><MapPin className="h-4 w-4" /></div>
                                          <p className="text-sm font-medium text-white">Use my current location</p>
                                       </button>
                                       {pickupSuggestions.map(option => (
                                          <button key={option.id} type="button" onClick={() => selectPickup(option)}
                                             className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04]">
                                             <div className="rounded-full bg-white/[0.06] p-1.5 text-white/40"><MapPin className="h-4 w-4" /></div>
                                             <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-white">{option.label}</p>
                                                <p className="truncate text-xs text-white/45">{option.secondaryLabel}</p>
                                             </div>
                                          </button>
                                       ))}
                                    </>
                                 )}
                                 {activeInput === 'drop' && (
                                    <>
                                       {destinationSearchLoading && (
                                          <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40">
                                             <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Searching{'\u2026'}
                                          </div>
                                       )}
                                       {destinationSuggestions.map(option => (
                                          <button key={option.id} type="button" onClick={() => selectDestination(option)}
                                             className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04]">
                                             <div className="rounded-full bg-white/[0.06] p-1.5 text-white/40"><Search className="h-4 w-4" /></div>
                                             <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-white">{option.label}</p>
                                                <p className="truncate text-xs text-white/45">{option.secondaryLabel}</p>
                                             </div>
                                          </button>
                                       ))}
                                    </>
                                 )}
                              </div>
                           )}
                           </div>
                        </div>

                        {/* Bento Grid layout for secondary features */}
                        {!showSuggestions && (
                           <div className="bento-grid">
                              {/* Price Prediction Bento Block (Glassmorphic) */}
                              <div className="col-span-12 sm:col-span-6 glass-container glass-container--rounded">
                                 <div className="glass-filter"></div>
                                 <div className="glass-overlay"></div>
                                 <div className="glass-specular"></div>
                                 <div className="glass-content p-6 flex flex-col justify-between">
                                    <PricePrediction
                                       pickup={pickupLocation.label}
                                       destination={destinationLocation.label}
                                       baseFare={Number(hasActivePass ? discountedFare : estimatedFare) / 1000000}
                                       flat
                                    />
                                 </div>
                              </div>

                              {/* Trip summary Bento Block (Glassmorphic) */}
                              <div className="col-span-12 sm:col-span-6 glass-container glass-container--rounded">
                                 <div className="glass-filter"></div>
                                 <div className="glass-overlay"></div>
                                 <div className="glass-specular"></div>
                                 <div className="glass-content p-6 flex flex-col justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50 border-b border-current/10 pb-2">Trip Summary</p>
                                    <div className="grid grid-cols-3 gap-2 pt-4 flex-1">
                                       <div className="text-center sm:text-left">
                                          <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Distance</p>
                                          <p className="mt-1 text-sm font-black text-current">{distanceKm.toFixed(1)} km</p>
                                       </div>
                                       <div className="text-center sm:text-left border-l border-current/10 pl-3">
                                          <p className="text-[9px] font-black uppercase tracking-widest opacity-50">ETA</p>
                                          <p className="mt-1 flex items-center justify-center sm:justify-start gap-1 text-sm font-black text-current">
                                             <Clock3 className="h-3.5 w-3.5 opacity-55" />
                                             {Math.max(4, Math.round(distanceKm * 2.4))}m
                                          </p>
                                       </div>
                                       <div className="text-center sm:text-left border-l border-current/10 pl-3">
                                          <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Total Fare</p>
                                          {hasActivePass && discountedFare < estimatedFare ? (
                                             <div className="mt-0.5">
                                                <p className="text-sm font-black text-emerald-700">{ride.formatAlgoAmount(discountedFare)}</p>
                                                <p className="text-[9px] opacity-40 line-through">{ride.formatAlgoAmount(estimatedFare)}</p>
                                                <p className="text-[8px] font-bold text-emerald-700 uppercase tracking-tight block mt-0.5">{passData.activePass!.discount}% Pass applied</p>
                                                {(surgeMultipliers.weather > 1.0 || surgeMultipliers.traffic > 1.0) && (
                                                   <div className="mt-1 flex flex-col gap-0.5 border-t border-current/10 pt-1">
                                                      <p className="text-[8px] font-medium opacity-60">Base: {ride.formatAlgoAmount(baseEstimatedFare)}</p>
                                                      <p className="text-[8px] font-bold text-amber-400">+ Surge: {ride.formatAlgoAmount(estimatedFare - baseEstimatedFare)}</p>
                                                   </div>
                                                )}
                                             </div>
                                          ) : (
                                             <div className="mt-0.5">
                                                <p className="text-sm font-black text-current">{ride.formatAlgoAmount(estimatedFare)}</p>
                                                {(surgeMultipliers.weather > 1.0 || surgeMultipliers.traffic > 1.0) && (
                                                   <div className="mt-1 flex flex-col gap-0.5 border-t border-current/10 pt-1">
                                                      <p className="text-[8px] font-medium opacity-60">Base: {ride.formatAlgoAmount(baseEstimatedFare)}</p>
                                                      <p className="text-[8px] font-bold text-amber-400">+ Surge: {ride.formatAlgoAmount(estimatedFare - baseEstimatedFare)}</p>
                                                   </div>
                                                )}
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 </div>
                              </div>

                              {/* Surge Reason Block */}
                              {(surgeMultipliers.weather > 1.0 || surgeMultipliers.traffic > 1.0) && (
                                 <div className="col-span-12 glass-container glass-container--rounded border border-amber-500/20">
                                    <div className="glass-filter"></div>
                                    <div className="glass-overlay bg-amber-500/5"></div>
                                    <div className="glass-specular"></div>
                                    <div className="glass-content p-4 flex flex-col gap-2">
                                       <div className="flex items-center gap-2 text-amber-400">
                                          <Zap className="h-4 w-4" />
                                          <p className="text-[10px] font-black uppercase tracking-widest opacity-90">Surge Pricing Active</p>
                                       </div>
                                       <p className="text-xs text-white/70 leading-relaxed font-medium">
                                          {surgeMultipliers.weather > 1.0 && surgeMultipliers.traffic > 1.0 
                                             ? "Fares are currently higher due to heavy traffic delays and poor weather conditions in your area."
                                             : surgeMultipliers.weather > 1.0 
                                             ? "Fares are currently higher due to poor weather conditions in your area."
                                             : "Fares are currently higher due to heavy traffic delays on your selected route."}
                                       </p>
                                    </div>
                                 </div>
                              )}

                              {/* Vehicle options (Glassmorphic) */}
                              <div className="col-span-12 space-y-3.5">
                                 <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 pl-1">Select Ride Mode</p>
                                    {(surgeMultipliers.weather > 1.0 || surgeMultipliers.traffic > 1.0) && (
                                       <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                                          {surgeLoading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                                          Surge Pricing Active
                                       </span>
                                    )}
                                 </div>
                                 <div className="grid gap-3">
                                    {ride.vehicleOptions.map((vehicle) => {
                                       const fare = BigInt(Math.max(100000, Math.round(distanceKm * 1000000 * vehicle.multiplier * 0.18 * surgeMultipliers.weather * surgeMultipliers.traffic)))
                                       const selected = ride.selectedVehicleId === vehicle.id
                                       return (
                                          <button
                                             key={vehicle.id}
                                             type="button"
                                             onClick={() => ride.setSelectedVehicleId(vehicle.id)}
                                             className={cn(
                                                'transition-all active:scale-[0.99] glass-container glass-container--rounded block',
                                                selected
                                                   ? 'bg-white/[1] border-white/30 shadow-[0_8px_24px_rgba(255,255,255,0.04)]'
                                                   : 'bg-white/[0.05] border-white/10 opacity-70 hover:opacity-100',
                                             )}
                                          >
                                             <div className="glass-filter"></div>
                                             <div className="glass-overlay"></div>
                                             <div className="glass-specular"></div>
                                             <div className="glass-content flex items-center justify-between gap-4 p-4 text-left">
                                                <div className="flex items-center gap-4">
                                                   <div className={cn('rounded-2xl p-2 shrink-0 shadow-md', vehicle.gradient)}>
                                                      <img 
                                                         src={vehicleIcons[vehicle.id]} 
                                                         alt={vehicle.name} 
                                                         className="h-[52px] w-[52px] object-contain drop-shadow-md dark:[filter:drop-shadow(1px_1px_0_white)_drop-shadow(-1px_-1px_0_white)_drop-shadow(1px_-1px_0_white)_drop-shadow(-1px_1px_0_white)]"
                                                      />
                                                   </div>
                                                   <div>
                                                      <p className="text-sm font-bold text-white">{vehicle.name}</p>
                                                      <p className="text-xs text-white/40">{vehicle.description}</p>
                                                   </div>
                                                </div>
                                                <div className="text-right">
                                                   <p className="text-sm font-black text-white">{ride.formatAlgoAmount(fare)}</p>
                                                   <p className="text-xs text-white/40">{Math.max(4, Math.round(distanceKm * 2.4))} min</p>
                                                </div>
                                             </div>
                                          </button>
                                       )
                                    })}
                                 </div>
                              </div>

                              {/* Book CTA (Claymorphic) */}
                              <div className="col-span-12 pt-2">
                                 <button
                                    type="button"
                                    disabled={!ride.activeAddress || ride.actionState.createRide || ride.actionState.optIn || isLocating}
                                    onClick={() => void handleCreateRide()}
                                    className="w-full clay-btn clay-btn-brand flex items-center justify-center gap-2.5 text-headline disabled:opacity-40 disabled:cursor-not-allowed"
                                 >
                                    {ride.actionState.createRide || ride.actionState.optIn ? (
                                       <LoaderCircle className="h-5 w-5 animate-spin" />
                                    ) : (
                                       <CarFront className="h-5 w-5" />
                                    )}
                                    {ride.actionState.optIn
                                       ? 'Opting into GIGC\u2026'
                                       : ride.actionState.createRide
                                          ? 'Creating ride\u2026'
                                          : `Book ${ride.selectedVehicle.name}`
                                    }
                                 </button>
                              </div>
                           </div>
                        )}

                        {refundedTxId && (
                           <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 text-left mb-3 backdrop-blur-md">
                              <div className="flex items-start gap-4.5">
                                 <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                                 <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">Ride Auto-Refunded</p>
                                    <p className="mt-1.5 text-xs text-white/60 leading-relaxed">
                                       The driver did not reach the drop location within the allowed distance-based time limit. Your escrowed GIGC tokens have been auto-refunded to your wallet.
                                    </p>
                                    <a 
                                       href={`https://testnet.explorer.peraswap.app/tx/${refundedTxId}`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="mt-3 inline-flex items-center text-[10px] text-emerald-400 font-mono underline hover:text-emerald-300"
                                    >
                                       TxID: {refundedTxId.slice(0, 10)}...{refundedTxId.slice(-10)} ↗
                                    </a>
                                    <button
                                       type="button"
                                       onClick={() => setRefundedTxId(null)}
                                       className="mt-3 block text-xs text-white/40 hover:text-white/60 underline"
                                    >
                                       Dismiss
                                    </button>
                                 </div>
                              </div>
                           </div>
                        )}

                        {/* Active ride status */}
                        {activeRide && !showSuggestions && (
                           <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                              className="rounded-3xl border border-white/10 glass-container glass-container--rounded">
                              <div className="glass-filter"></div>
                              <div className="glass-overlay"></div>
                              <div className="glass-specular"></div>
                              <div className="glass-content p-5">
                                 <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                       <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Active ride</p>
                                       <p className="mt-1 text-base font-bold text-white">Ride #{activeRide.rideId.toString()}</p>
                                       <p className="mt-1 truncate text-xs text-white/45">{activeRide.pickup.label} {'\u2192'} {activeRide.drop.label}</p>
                                    </div>
                                    <span className={cn(
                                       'shrink-0 rounded-xl border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider',
                                       activeRide.status === RideStatus.REQUESTED && 'border-amber-500/20 bg-amber-500/10 text-amber-400',
                                       activeRide.status === RideStatus.RIDER_ASSIGNED && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
                                       activeRide.status === RideStatus.DRIVER_ARRIVED && 'border-purple-500/20 bg-purple-500/10 text-purple-400',
                                       activeRide.status === RideStatus.RIDE_STARTED && 'border-sky-500/20 bg-sky-500/10 text-sky-400',
                                       activeRide.status === RideStatus.DROPPED_OFF && 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400',
                                    )}>
                                       {activeRide.status}
                                    </span>
                                 </div>
                                 {(activeRide.status === RideStatus.REQUESTED || activeRide.status === RideStatus.RIDER_ASSIGNED || activeRide.status === RideStatus.DRIVER_ARRIVED) && (
                                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                                       <button type="button" disabled={ride.actionState.endRide} onClick={() => setShowCancelConfirm(activeRide.rideId)}
                                          className="clay-btn py-2.5 px-5 text-xs rounded-xl disabled:opacity-45 bg-rose-500 hover:bg-rose-600 text-white">
                                          {ride.actionState.endRide ? 'Cancelling\u2026' : 'Cancel Ride'}
                                       </button>
                                    </div>
                                 )}
                                 {showCancelConfirm === activeRide.rideId && (
                                    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
                                       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm glass-container glass-container--rounded glass-container--large shadow-2xl p-6 relative">
                                          <div className="glass-filter" style={{ backdropFilter: 'blur(32px) saturate(150%)' }}></div>
                                          <div className="glass-overlay"></div>
                                          <div className="glass-specular"></div>
                                          <div className="glass-content relative">
                                             <h3 className="text-lg font-bold text-white mb-2">Cancel Ride?</h3>
                                             <div className="text-sm text-white/70 mb-6 leading-relaxed">
                                                <p className="mb-2"><strong>Cancellation Policy:</strong></p>
                                                <ul className="list-disc pl-5 space-y-1">
                                                   <li><strong>Before driver arrival:</strong> You will receive a full refund.</li>
                                                   <li><strong>After driver arrival:</strong> Your fare will not be refunded and will be paid to the driver.</li>
                                                </ul>
                                             </div>
                                             <div className="flex gap-3">
                                                <button onClick={() => setShowCancelConfirm(null)} className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition">Go Back</button>
                                                <button onClick={() => { setShowCancelConfirm(null); void ride.cancelRide(activeRide.rideId); }} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white hover:bg-rose-600 shadow-[0_4px_20px_rgba(244,63,94,0.3)] transition">Confirm Cancel</button>
                                             </div>
                                          </div>
                                       </motion.div>
                                    </div>
                                 )}
                                 {(activeRide.status === RideStatus.RIDER_ASSIGNED || activeRide.status === RideStatus.DRIVER_ARRIVED) && (
                                    <div className="mt-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/10 p-4">
                                       {!activeRide.customerPressedImHere && (
                                          <div className="mb-4">
                                             <button type="button" onClick={async () => {
                                                let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                                                await fetch(`${BACKEND_URL}/api/rides/presence-event`, {
                                                   method: 'POST',
                                                   headers: { 'Content-Type': 'application/json' },
                                                   body: JSON.stringify({ rideId: activeRide.rideId.toString(), event: 'IM_HERE_PRESSED' })
                                                })
                                                ride.refreshRides()
                                             }} className="clay-btn py-2.5 px-5 text-xs rounded-xl bg-sky-500 hover:bg-sky-600 text-white w-full shadow-[0_4px_20px_rgba(14,165,233,0.3)] border border-sky-400/20">
                                                I'm Here (Notify Driver)
                                             </button>
                                          </div>
                                       )}
                                       {activeRide.status === RideStatus.DRIVER_ARRIVED && (
                                          <div className="mb-4 rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-purple-300">
                                             <p className="text-xs font-bold uppercase tracking-wider mb-1">Driver Has Arrived</p>
                                             <p className="text-sm font-mono">{waitTimerString}</p>
                                          </div>
                                       )}
                                       <div className="flex items-center gap-2">
                                          <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                          <p className="text-xs font-bold text-white uppercase tracking-wider">Share OTP with driver</p>
                                       </div>
                                       <div className="mt-3 flex items-center gap-4">
                                          <button type="button" onClick={() => void handleGenerateOtp(activeRide.rideId)}
                                             disabled={ride.actionState.storeOtp}
                                             className="clay-btn py-2.5 px-5 text-xs rounded-xl disabled:opacity-45">
                                             {ride.actionState.storeOtp ? 'Generating\u2026' : activeRide.otp ? 'Regen OTP' : 'Generate OTP'}
                                          </button>
                                          {activeRide.otp && (
                                             <span className="font-mono text-2xl font-black tracking-[0.3em] text-emerald-300">{activeRide.otp}</span>
                                          )}
                                       </div>
                                    </div>
                                 )}
                                 {activeRide.status === RideStatus.RIDE_STARTED && (
                                    <div className="mt-4 space-y-4">
                                       <div className="flex items-center gap-2 rounded-2xl border border-sky-500/10 bg-sky-500/[0.04] p-3 text-xs font-bold text-sky-300 uppercase tracking-wider">
                                          <UserRound className="h-4 w-4 text-sky-400" />
                                          Ride in progress {'\u00B7'} Escrow locked
                                       </div>


                                    </div>
                                 )}
                                 {activeRide.status === RideStatus.DROPPED_OFF && (
                                    <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">
                                       <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                                          <p className="text-sm font-semibold text-white">Ride Complete!</p>
                                          <p className="mt-1 text-xs leading-5 text-indigo-200">The driver has dropped you off. Please release the payment from the smart contract escrow to complete this ride.</p>
                                       </div>
                                       <button type="button" onClick={() => void ride.customerConfirmPayout(activeRide.rideId)}
                                          disabled={ride.actionState.payout}
                                          className="clay-btn py-3 px-5 text-sm font-bold w-full rounded-xl disabled:opacity-45 bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)]">
                                          {ride.actionState.payout ? 'Processing Payment\u2026' : 'Release Payment'}
                                       </button>
                                    </div>
                                 )}
                              </div>
                           </motion.div>
                        )}
                     </div>
                  </div>
               </motion.div>
            )}

            {/* ══════════════════════ HISTORY TAB ══════════════════════ */}
            {tab === 'history' && (
               <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 overflow-y-auto">
                  <div className="mx-auto w-full max-w-2xl space-y-3 px-4 py-5 sm:px-6">
                     <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Ride history</h3>
                        <div className="flex items-center gap-1.5">
                           <button type="button" onClick={() => ride.clearHistory()}
                              className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-white/50 transition hover:bg-rose-500/10 hover:text-rose-400" title="Clear">
                              <Trash2 className="h-3.5 w-3.5" />
                           </button>
                           <button type="button" onClick={() => void ride.refreshRides()}
                              className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-white/50 transition hover:bg-white/[0.06]">
                              <RefreshCw className={cn('h-3.5 w-3.5', ride.actionState.refresh && 'animate-spin')} />
                           </button>
                        </div>
                     </div>

                     <AnimatePresence initial={false}>
                        {ride.customerRides.map((item) => (
                           <motion.div key={item.rideId.toString()} layout
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                              onClick={() => ride.setFocusedRideId(item.rideId)}
                              className={cn(
                                 'w-full text-left transition cursor-pointer glass-container glass-container--rounded block',
                                 ride.focusedRideId === item.rideId
                                    ? 'bg-white/[0.14] border-white/30 shadow-[0_8px_24px_rgba(255,255,255,0.04)]'
                                    : 'bg-white/[0.05] border-white/10 opacity-70 hover:opacity-100',
                              )}>
                              <div className="glass-filter"></div>
                              <div className="glass-overlay"></div>
                              <div className="glass-specular"></div>
                              <div className="glass-content p-4">
                                 <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                       <p className="text-sm font-medium text-white">Ride #{item.rideId.toString()}</p>
                                       <p className="mt-1 truncate text-xs text-white/40">{item.pickup.label} {'\u2192'} {item.drop.label}</p>
                                    </div>
                                    <div className={cn(
                                       'shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium',
                                       item.status === RideStatus.PAID || item.status === RideStatus.RIDE_COMPLETED
                                          ? 'bg-white/[0.04] text-white/40'
                                          : 'bg-emerald-500/10 text-emerald-400',
                                    )}>
                                       {item.status === RideStatus.PAID
                                          ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</span>
                                          : item.status}
                                    </div>
                                 </div>
                                 {item.status === RideStatus.REQUESTED && (
                                    <div className="mt-3 flex justify-end">
                                       <button type="button" disabled={ride.actionState.endRide} onClick={(e) => { e.stopPropagation(); void ride.cancelRide(item.rideId); }}
                                          className="text-xs text-rose-400 font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 transition">
                                          {ride.actionState.endRide ? 'Cancelling\u2026' : 'Cancel Ride'}
                                       </button>
                                    </div>
                                 )}
                                 {(item.status === RideStatus.RIDER_ASSIGNED || item.status === RideStatus.DRIVER_ARRIVED) && (
                                    <div className="mt-3 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.05] p-3">
                                       {item.status === RideStatus.DRIVER_ARRIVED && (
                                          <div className="mb-2 text-xs font-bold text-purple-400">Driver Arrived</div>
                                       )}
                                       <p className="text-xs font-medium text-white">OTP: <span className="font-mono tracking-widest">{item.otp ?? 'Not generated'}</span></p>
                                       <button type="button" onClick={(e) => { e.stopPropagation(); void handleGenerateOtp(item.rideId) }}
                                          disabled={ride.actionState.storeOtp}
                                          className="mt-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-45">
                                          {item.otp ? 'Regenerate OTP' : 'Generate OTP'}
                                       </button>
                                    </div>
                                 )}
                                 {item.status === RideStatus.DROPPED_OFF && (
                                    <button type="button" onClick={(e) => { e.stopPropagation(); void ride.customerConfirmPayout(item.rideId) }}
                                       disabled={ride.actionState.payout || !item.rider}
                                       className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#05060a] disabled:opacity-45 transition hover:bg-white/90">
                                       {ride.actionState.payout ? 'Paying...' : 'Release payment'}
                                    </button>
                                 )}
                                 {['RIDE_COMPLETED', 'PAID', 'CANCELLED'].includes(item.status) && item.receiptHash && (
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedReceiptRide(item) }}
                                       className="mt-3 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold text-white transition">
                                       View Web3 Receipt
                                    </button>
                                 )}
                              </div>
                           </motion.div>
                        ))}
                     </AnimatePresence>

                     {!ride.customerRides.length && (
                        <div className="glass-container glass-container--rounded w-full text-center">
                           <div className="glass-filter"></div>
                           <div className="glass-overlay"></div>
                           <div className="glass-specular"></div>
                           <div className="glass-content p-10 text-sm text-white/40 border border-dashed border-white/[0.08]">
                              No rides yet. Book from the <strong className="text-white/60">Book</strong> tab.
                           </div>
                        </div>
                     )}
                  </div>
               </motion.div>
            )}

            {/* ══════════════════════ PASSES TAB ══════════════════════ */}
            {tab === 'passes' && (
               <PassesTabContent ride={ride} />
            )}
         </AnimatePresence>

         {/* Success overlay */}
         {typeof document !== 'undefined' && createPortal(
            <AnimatePresence>
               {showSuccess && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                     className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05060a]/90 backdrop-blur-md">
                     <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                        className="flex h-24 w-24 items-center justify-center rounded-2xl bg-emerald-500">
                        <ShieldCheck className="h-12 w-12 text-white" />
                     </motion.div>
                     <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                        className="mt-6 text-3xl font-bold text-white">
                        Ride Requested!
                     </motion.h2>
                     <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                        className="mt-2 text-white/50">
                        Waiting for a rider to accept...
                     </motion.p>
                  </motion.div>
               )}
            </AnimatePresence>,
            document.body
         )}

         {selectedReceiptRide && (
            <Web3ReceiptModal ride={selectedReceiptRide} onClose={() => setSelectedReceiptRide(null)} />
         )}
         <PWAInstallFooter />
        
         {typeof document !== 'undefined' && createPortal(
            <AnimatePresence>
               {showOptInPopup && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                     className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05060a]/90 backdrop-blur-md px-4">
                     <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                        className="w-full max-w-sm glass-container glass-container--rounded glass-container--large p-6 relative">
                        <div className="glass-filter" style={{ backdropFilter: 'blur(32px) saturate(150%)' }}></div>
                        <div className="glass-overlay"></div>
                        <div className="glass-specular"></div>
                        <div className="glass-content text-center">
                           <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-rose-500/10 text-rose-400 mb-4">
                              <Zap className="h-6 w-6" />
                           </div>
                           <h3 className="text-lg font-bold text-white mb-2">Not Opted In</h3>
                           <p className="text-sm text-white/60 mb-6">
                              You have not opted into GIGC. Go to profile {'\u2192'} topup-GIGC to opt in before booking a ride.
                           </p>
                           <div className="flex gap-3 justify-center">
                              <button type="button" onClick={() => setShowOptInPopup(false)}
                                 className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5">
                                 Close
                              </button>
                           </div>
                        </div>
                     </motion.div>
                  </motion.div>
               )}
            </AnimatePresence>,
            document.body
         )}
      </div>
   )
}

// ── Passes Tab ──
function PassesTabContent({ ride }: { ride: RideHook }) {
   const { passes, activeTier, isLoading, error, refetch, hasPriorityMatching, hasZeroSurge } = useAlgorandAssets()
   const [selectedPass, setSelectedPass] = useState<PassInfo | null>(null)

   const tierNames: Record<PassTier, string> = { silver: 'Silver', gold: 'Gold', platinum: 'Platinum' }

   return (
      <motion.div key="passes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
         className="flex-1 overflow-y-auto">
         <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
               <h2 className="text-2xl font-bold text-white sm:text-3xl">Your Passes</h2>
               <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/40">
                  NFT-powered ride passes on Algorand. Buy passes using GIGC and get automatic discounts.
               </p>
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
               className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
               {[
                  { label: 'Active Tier', value: activeTier ? tierNames[activeTier] : 'None', on: Boolean(activeTier) },
                  { label: 'Priority', value: hasPriorityMatching ? 'On' : 'Off', on: hasPriorityMatching },
                  { label: 'Zero Surge', value: hasZeroSurge ? 'On' : 'Off', on: hasZeroSurge },
               ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                     <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">{s.label}</p>
                     <p className={cn('mt-1.5 text-sm font-semibold', s.on ? 'text-emerald-400' : 'text-white/35')}>{s.value}</p>
                  </div>
               ))}
            </motion.div>

            {isLoading && (
               <div className="mt-12 flex flex-col items-center gap-3 py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-white/30" />
                  <p className="text-sm text-white/30">Verifying passes on-chain{'\u2026'}</p>
               </div>
            )}

            {error && (
               <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-xl border border-rose-500/15 bg-rose-500/[0.05] p-4">
                  <div className="flex items-center gap-2">
                     <Zap className="h-4 w-4 text-rose-400" />
                     <p className="text-sm font-medium text-rose-300">Verification Error</p>
                  </div>
                  <p className="mt-1 text-xs text-white/40">{error}</p>
                  <button type="button" onClick={refetch}
                     className="mt-3 rounded-lg bg-rose-500/10 px-3.5 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20">
                     Retry
                  </button>
               </motion.div>
            )}

            {/* Cards */}
            {!isLoading && (
               <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {passes.map((pass, i) => (
                     <motion.div key={pass.tier} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
                        <NFTPassCard
                           pass={pass}
                           isWalletConnected={true}
                           onBuyPass={() => setSelectedPass(pass)}
                        />
                     </motion.div>
                  ))}
               </div>
            )}

            {/* How it works */}
            {!isLoading && (
               <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  className="mt-10 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <h3 className="text-base font-semibold text-white">How it works</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                     {[
                        { n: '01', t: 'Opt-in', d: 'Opt-in to the specific Gigo pass NFT (ASA) on your wallet.' },
                        { n: '02', t: 'Pay GIGC', d: 'Purchase the pass directly using GIGC tokens.' },
                        { n: '03', t: 'Enjoy Benefits', d: 'Discounts apply automatically. Higher tiers unlock priority matching & zero surge.' },
                     ].map((item) => (
                        <div key={item.n} className="flex gap-3">
                           <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-[11px] font-bold text-white/40">{item.n}</div>
                           <div>
                              <p className="text-sm font-medium text-white">{item.t}</p>
                              <p className="mt-0.5 text-xs text-white/35">{item.d}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </motion.div>
            )}
         </div>

         <AnimatePresence>
            {selectedPass && (
               <PassPurchaseModal
                  pass={selectedPass}
                  ride={ride}
                  onClose={() => setSelectedPass(null)}
                  onSuccess={() => {
                     setSelectedPass(null)
                     refetch()
                  }}
               />
            )}
         </AnimatePresence>
      </motion.div>
   )
}

function CustomerProfileDropdown({ 
   ride,
   onSwitchRole, 
   currentTab, 
   onTabChange, 
   rideCount 
}: { 
   ride: RideHook,
   onSwitchRole: (role: AppRole) => void, 
   currentTab?: string, 
   onTabChange?: (tab: 'book' | 'history' | 'passes') => void,
   rideCount?: number
}) {
   const { activeAddress, activeWallet } = useWallet()
   const [isOpen, setIsOpen] = useState(false)
   const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
   const [isUploading, setIsUploading] = useState(false)

   const [gigcBalance, setGigcBalance] = useState<number | null>(null)
   const [isOptedIn, setIsOptedIn] = useState<boolean>(true)
   const [isFetchingBalance, setIsFetchingBalance] = useState(false)
   const [isTopUpOpen, setIsTopUpOpen] = useState(false)

   const fetchGigcBalance = useCallback(async () => {
      if (!activeAddress) return;
      setIsFetchingBalance(true);
      try {
         const { optedIn, balance } = await ride.checkAsaBalance(activeAddress);
         setIsOptedIn(optedIn);
         setGigcBalance(Number(balance) / 1000000);
      } catch (err) {
         console.error('Error fetching GIGC balance:', err);
      } finally {
         setIsFetchingBalance(false);
      }
   }, [activeAddress, ride]);

   useEffect(() => {
      if (activeAddress) {
         fetchGigcBalance();
      }
   }, [activeAddress, fetchGigcBalance]);


   useEffect(() => {
      if (activeAddress) {
         const fetchProfile = async () => {
            try {
               const photoBase64 = await ipfs.getCustomerProfileBase64(activeAddress);
               if (photoBase64) {
                  setProfilePhoto(photoBase64);
                  return;
               }
               
               // Fallback to rider documents if available (not needed anymore, but we can keep it safely)
               const driverCid = await ipfs.getDriverMetadataCID(activeAddress);
               if (driverCid) {
                  const driverData = await ipfs.getJSON(driverCid);
                  if (driverData?.documents?.['Profile Photo']) {
                     setProfilePhoto(ipfs.getGatewayUrl(driverData.documents['Profile Photo']));
                  }
               }
            } catch (e) {
               console.error('Failed to fetch customer profile', e);
            }
         };
         fetchProfile();
      }
   }, [activeAddress])

   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !activeAddress) return

      // Validate file size (< 2MB)
      if (file.size > 2 * 1024 * 1024) {
         alert('File must be smaller than 2MB');
         return;
      }

      try {
         setIsUploading(true)
         
         // Convert file to base64
         const reader = new FileReader();
         reader.readAsDataURL(file);
         
         reader.onload = async () => {
            const base64String = reader.result as string;
            await ipfs.saveCustomerProfile(activeAddress, base64String);
            setProfilePhoto(base64String);
            setIsUploading(false);
         };
         
         reader.onerror = (error) => {
            console.error('Error reading file:', error);
            setIsUploading(false);
         };
      } catch (err) {
         console.error('Profile upload failed:', err)
         setIsUploading(false)
      }
   }

   if (!activeAddress) return <WalletConnectButton />

   return (
      <div className="relative">
         <button 
            onClick={() => setIsOpen(!isOpen)}
            disabled={isUploading}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.3)] overflow-hidden disabled:opacity-50"
         >
            {isUploading ? (
               <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            ) : profilePhoto ? (
               <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
               <UserRound className="w-5 h-5 text-white/70" />
            )}
         </button>

         <AnimatePresence>
            {isOpen && (
               <div className="absolute right-0 top-full mt-3 w-[280px] sm:w-64 origin-top-right z-[100] pointer-events-auto">
                  <motion.div 
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     className="w-full bg-white rounded-3xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] border border-slate-200 overflow-hidden"
                  >
                     <div className="p-4">
                        <div className="flex items-center gap-3 mb-4 p-2 bg-white/5 rounded-xl group relative">
                           <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                              {profilePhoto ? (
                                 <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                 <UserRound className="w-5 h-5 text-white/70" />
                              )}
                           </div>
                           <div className="overflow-hidden flex-1">
                              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Account</p>
                              <p className="text-sm font-mono truncate text-white/90">{activeAddress}</p>
                           </div>
                           <label className="absolute -left-1 -top-1 bg-emerald-500 rounded-full p-1.5 cursor-pointer shadow-lg opacity-0 group-hover:opacity-100 transition-opacity scale-75 hover:scale-90">
                              <Camera className="w-3.5 h-3.5 text-black" />
                              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                           </label>
                        </div>

                        {!profilePhoto && (
                           <div className="mb-4">
                              <button 
                                 onClick={() => document.getElementById('profile-upload')?.click()}
                                 className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/10 transition text-left group"
                              >
                                 <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                                    <Camera className="w-4 h-4" />
                                 </div>
                                 <div>
                                    <span className="text-sm font-medium block">Update Photo</span>
                                    <span className="text-[10px] text-white/30">Max 2MB</span>
                                 </div>
                                 <input id="profile-upload" type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                              </button>
                           </div>
                        )}

                         {/* Mobile Tabs */}
                         {onTabChange && (
                            <div className="lg:hidden space-y-1 mb-4 border-b border-white/10 pb-4">
                               <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-2 px-1">Navigation</p>
                               <button onClick={() => { setIsOpen(false); onTabChange('book') }} className={cn("w-full flex items-center gap-3 p-2.5 rounded-xl transition text-left", currentTab === 'book' ? "bg-white/10 text-white" : "bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white")}>
                                  <CarFront className="w-4 h-4" />
                                  <span className="text-sm font-medium">Book</span>
                               </button>
                               <button onClick={() => { setIsOpen(false); onTabChange('history') }} className={cn("w-full flex items-center justify-between gap-3 p-2.5 rounded-xl transition text-left", currentTab === 'history' ? "bg-white/10 text-white" : "bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white")}>
                                  <div className="flex items-center gap-3">
                                     <History className="w-4 h-4" />
                                     <span className="text-sm font-medium">My Rides</span>
                                  </div>
                                  {rideCount ? <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{rideCount}</span> : null}
                               </button>
                               <button onClick={() => { setIsOpen(false); onTabChange('passes') }} className={cn("w-full flex items-center gap-3 p-2.5 rounded-xl transition text-left", currentTab === 'passes' ? "bg-white/10 text-white" : "bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white")}>
                                  <Gem className="w-4 h-4" />
                                  <span className="text-sm font-medium">Your Passes</span>
                               </button>
                            </div>
                         )}

                         <div className="space-y-2 mb-4">
                           <button 
                              onClick={() => { setIsOpen(false); onSwitchRole('driver') }}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/10 transition text-left"
                           >
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm font-medium">Driver Dashboard</span>
                           </button>
                           <button 
                              onClick={() => { setIsOpen(false); onSwitchRole('admin') }}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/10 transition text-left"
                           >
                              <ShieldCheck className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-medium">Admin Dashboard</span>
                           </button>
                        </div>

                        <div className="mb-4 p-3.5 rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-xl">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/40 mb-2 font-bold">
                               <span>Status</span>
                               <span className="font-semibold text-emerald-400 flex items-center gap-1.5 normal-case font-mono">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                  Connected
                               </span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-semibold">
                               <span className="text-white/60">Your GIGC Balance</span>
                               <span className="font-bold text-white flex items-center gap-1">
                                  {isFetchingBalance ? (
                                     <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />
                                  ) : (
                                     `${gigcBalance !== null ? gigcBalance.toLocaleString() : '0'} GIGC`
                                  )}
                               </span>
                            </div>
                         </div>

                         <button 
                            onClick={() => { setIsOpen(false); setIsTopUpOpen(true) }}
                            className="w-full flex items-center justify-center gap-2 py-3 mb-2.5 rounded-xl bg-white text-black hover:bg-white/90 active:scale-[0.98] transition font-bold text-sm shadow-lg shadow-black/20"
                         >
                            <Coins className="w-4 h-4" />
                            Top-Up GIGC
                         </button>

                        <button 
                           onClick={() => activeWallet?.disconnect()}
                           className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-[0.98] transition font-semibold text-sm"
                        >
                           Disconnect Wallet
                        </button>
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>

         {typeof document !== 'undefined' && createPortal(
            <AnimatePresence>
               {isTopUpOpen && (
                  <TopUpModal 
                     ride={ride}
                     activeAddress={activeAddress}
                     isOptedIn={isOptedIn}
                     onClose={() => setIsTopUpOpen(false)}
                     onSuccess={() => {
                        fetchGigcBalance();
                        setIsTopUpOpen(false);
                     }}
                  />
               )}
            </AnimatePresence>,
            document.body
         )}
      </div>
   )
}

// ── Premium Top-Up Modal Component ──
interface TopUpModalProps {
   ride: RideHook;
   activeAddress: string;
   isOptedIn: boolean;
   onClose: () => void;
   onSuccess: () => void;
}

function TopUpModal({ ride, activeAddress, isOptedIn, onClose, onSuccess }: TopUpModalProps) {
   const [gigcAmount, setGigcAmount] = useState<string>('100')
   const [status, setStatus] = useState<'idle' | 'awaiting-sig' | 'processing' | 'success' | 'error'>('idle')
   const [errorMsg, setErrorMsg] = useState<string>('')
   const [optInLoading, setOptInLoading] = useState(false)
   const [localIsOptedIn, setLocalIsOptedIn] = useState(isOptedIn)
   const { transactionSigner } = useWallet()

   let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

   const conversionRatio = 100 // 100 GIGC = 1 ALGO
   const gigcNum = parseFloat(gigcAmount) || 0
   const algoAmount = gigcNum / conversionRatio

   useEffect(() => {
      let isMounted = true
      const checkOptIn = async () => {
         try {
            const { optedIn } = await ride.checkAsaBalance(activeAddress)
            if (isMounted) setLocalIsOptedIn(optedIn)
         } catch (err) {
            console.error('Failed to check opt in:', err)
         }
      }
      checkOptIn()
      return () => { isMounted = false }
   }, [activeAddress, ride])

   const parseTransactionError = (err: any, fallbackMessage: string): string => {
      const msg = err?.message || err?.response?.data?.error || '';
      if (!msg) return fallbackMessage;

      if (msg === 'Network Error' || err?.code === 'ERR_NETWORK') {
         return 'Cannot connect to the backend server. Please ensure the backend is running or check your connection.';
      }

      const lower = msg.toLowerCase();
      if (lower.includes('below min') || lower.includes('minimum balance') || lower.includes('below minimum balance')) {
         return 'Insufficient ALGO in your wallet. Algorand requires a minimum balance of 0.1 ALGO base, plus 0.1 ALGO for each asset you opt into (total 0.2 ALGO for GIGC). Please get more ALGO first.';
      }
      if (lower.includes('overspend') || lower.includes('insufficient funds')) {
         return 'Insufficient ALGO balance to cover the payment amount and transaction fees.';
      }
      return msg;
   };

   const handleOptIn = async () => {
      setOptInLoading(true)
      setErrorMsg('')
      try {
         const success = await ride.optInToAsa()
         if (success) {
            setLocalIsOptedIn(true)
         } else {
            setErrorMsg('Opt-in transaction was not signed or failed.')
         }
      } catch (err: any) {
         setErrorMsg(parseTransactionError(err, 'Opt-in failed. Please try again.'))
      } finally {
         setOptInLoading(false)
      }
   }

   const handleConfirm = async () => {
      if (gigcNum <= 0) {
         setErrorMsg('Please enter a valid GIGC amount.')
         return
      }

      setStatus('awaiting-sig')
      setErrorMsg('')

      try {
         const algod = new algosdk.Algodv2(algorandConfig.algodToken, algorandConfig.algodServer, algorandConfig.algodPort)
         const suggestedParams = await algod.getTransactionParams().do()
         const microAlgos = Math.round(algoAmount * 1000000)

         // 1. User signs ALGO payment transaction to treasury wallet
         const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: 'FDSKCI2DHPIOTFR2CXHPESMLAUA4Y66B6KKGJ2CDKDY3UX34W43QVN52NA',
            amount: microAlgos,
            suggestedParams,
         })

         const atc = new algosdk.AtomicTransactionComposer()
         atc.addTransaction({ txn: paymentTxn, signer: transactionSigner })
         
         const result = await atc.execute(algod, 4)
         const txId = result.txIDs[0]

         setStatus('processing')

         // 2. Call backend to verify and release GIGC
         const response = await axios.post(`${BACKEND_URL}/api/topup`, {
            txId,
            gigcAmount: gigcNum,
            sender: activeAddress
         })

         if (response.data.success) {
            setStatus('success')
            setTimeout(() => {
               onSuccess()
             }, 2000)
          } else {
             throw new Error(response.data.error || 'Failed to verify transaction on the backend.')
          }
       } catch (err: any) {
          console.error('Top-up failed:', err)
          setErrorMsg(parseTransactionError(err, 'Top-Up failed.'))
          setStatus('error')
       }
    }

   return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md overflow-y-auto">
         <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md overflow-y-auto max-h-[90vh] glass-container glass-container--rounded glass-container--large shadow-2xl"
         >
            <div className="glass-filter" style={{ backdropFilter: 'blur(32px) saturate(150%)' }}></div>
            <div className="glass-overlay"></div>
            <div className="glass-specular"></div>
            <div className="glass-content p-6 relative">
               <div className="flex items-start justify-between mb-6 gap-4">
                  <div className="flex items-center gap-3">
                     <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 shrink-0">
                        <Coins className="w-6 h-6" />
                     </div>
                     <div className="text-left">
                        <h3 className="text-xl font-bold text-white">Top-Up GIGC</h3>
                        <p className="text-xs text-white/40">Purchase ride credits using ALGO</p>
                     </div>
                  </div>
                  <button
                     onClick={onClose}
                     className="glass-container glass-container--rounded text-white/55 transition hover:text-white shrink-0"
                     style={{ borderRadius: '9999px' }}
                  >
                     <div className="glass-filter" style={{ borderRadius: '9999px' }}></div>
                     <div className="glass-overlay"></div>
                     <div className="glass-specular" style={{ borderRadius: '9999px' }}></div>
                     <div className="glass-content p-2 flex items-center justify-center">
                        <X className="w-4 h-4" />
                     </div>
                  </button>
               </div>

               {status === 'idle' && (
                  <div className="space-y-5 text-left">
                     {!localIsOptedIn ? (
                        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4 text-sm text-amber-200/80">
                           <div className="flex items-start gap-2.5">
                              <Wallet className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                 <p className="font-semibold text-white">Opt-In Required</p>
                                 <p className="mt-1 text-xs text-white/50 leading-relaxed">
                                    To hold and receive GIGC ride credits (ASA), you must opt-in your account first. This requires a small on-chain transaction.
                                 </p>
                               </div>
                           </div>
                           <button
                              onClick={handleOptIn}
                              disabled={optInLoading}
                              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black py-2.5 font-bold text-xs uppercase tracking-wider transition"
                           >
                              {optInLoading ? (
                                 <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                 'Opt-In to GIGC ASA'
                              )}
                           </button>
                        </div>
                     ) : (
                        <>
                           <div className="glass-container glass-container--rounded w-full">
                              <div className="glass-filter"></div>
                              <div className="glass-overlay"></div>
                              <div className="glass-specular"></div>
                              <div className="glass-content p-4 space-y-2 text-left">
                                 <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest">
                                    Enter GIGC Amount
                                 </label>
                                 <div className="relative">
                                    <input
                                       type="number"
                                       min="1"
                                       step="1"
                                       value={gigcAmount}
                                       onChange={(e) => {
                                          setGigcAmount(e.target.value)
                                          setErrorMsg('')
                                       }}
                                       placeholder="e.g. 100"
                                       className="w-full bg-transparent py-2 pl-1 pr-16 text-lg font-bold text-white placeholder-white/20 outline-none focus:border-none focus:ring-0 transition"
                                    />
                                    <span className="absolute right-1 top-1/2 -translate-y-1/2 font-bold text-sm text-white/40">
                                       GIGC
                                    </span>
                                 </div>
                              </div>
                           </div>

                           <div className="glass-container glass-container--rounded w-full">
                              <div className="glass-filter"></div>
                              <div className="glass-overlay"></div>
                              <div className="glass-specular"></div>
                              <div className="glass-content p-4 space-y-2.5">
                                 <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/60">Exchange Rate</span>
                                    <span className="font-bold text-white">100 GIGC = 1 ALGO</span>
                                 </div>
                                 <div className="border-t border-white/10 pt-2.5 flex items-center justify-between text-sm">
                                    <span className="font-bold text-white/80">Payment Amount</span>
                                    <span className="font-black text-emerald-400">
                                       {algoAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ALGO
                                    </span>
                                 </div>
                              </div>
                           </div>
                        </>
                     )}

                     {errorMsg && (
                        <div className="rounded-xl border border-red-500/15 bg-red-500/[0.05] p-3 text-xs text-red-400">
                           {errorMsg}
                        </div>
                     )}

                     {localIsOptedIn && (
                        <div className="flex gap-3">
                           <button
                              onClick={onClose}
                              className="flex-1 glass-container glass-container--rounded text-white hover:bg-white/10 transition-all"
                              style={{ borderRadius: '9999px' }}
                           >
                              <div className="glass-filter" style={{ borderRadius: '9999px' }}></div>
                              <div className="glass-overlay"></div>
                              <div className="glass-specular"></div>
                              <div className="glass-content py-3 text-sm font-semibold flex items-center justify-center">
                                 Cancel
                              </div>
                           </button>
                           <button
                              onClick={handleConfirm}
                              disabled={gigcNum <= 0}
                              className="flex-1 clay-btn clay-btn-brand py-3 text-sm font-bold disabled:opacity-40"
                           >
                              Confirm Purchase
                           </button>
                        </div>
                     )}
                  </div>
               )}

               {status === 'awaiting-sig' && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                     <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
                     <h4 className="text-lg font-bold text-white font-mono">Awaiting Wallet Signature</h4>
                     <p className="mt-2 text-xs text-white/40 max-w-xs leading-relaxed">
                        Please open Pera Wallet on your device and sign the ALGO payment transaction to proceed.
                     </p>
                  </div>
               )}

               {status === 'processing' && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                     <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
                     <h4 className="text-lg font-bold text-white font-mono">Processing Payment</h4>
                     <p className="mt-2 text-xs text-white/40 max-w-xs leading-relaxed">
                        Verifying payment transaction on the blockchain and transferring GIGC ASA tokens to your wallet.
                     </p>
                  </div>
               )}

               {status === 'success' && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                     <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-black mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                     </div>
                     <h4 className="text-xl font-black text-white font-mono">Purchase Successful!</h4>
                     <p className="mt-2 text-xs text-white/40 max-w-xs leading-relaxed font-mono">
                        Your payment was verified. GIGC ride credits have been transferred to your wallet.
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
                           An error occurred while processing your top-up.
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
            </div>
         </motion.div>
      </div>
   )
}
