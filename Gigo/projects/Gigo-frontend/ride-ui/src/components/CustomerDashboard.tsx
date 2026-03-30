import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CarFront, CheckCircle2, Clock3, History, LoaderCircle, MapPin, RefreshCw, Search, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import { WalletConnectButton } from './WalletConnectButton'
import { BookingMap } from './BookingMap'
import { useGeolocation } from '../hooks/useGeolocation'
import { usePlaceSearch, reverseGeocodeLocation } from '../hooks/usePlaceSearch'
import { calculateDistanceKm } from '../lib/location'
import { cn } from '../lib/cn'
import { RideStatus, type PlaceSuggestion, type RideLocation } from '../types/ride'
import type { useRideContract } from '../hooks/useRideContract'
import { useEffect, useMemo, useState } from 'react'

type RideHook = ReturnType<typeof useRideContract>

export function CustomerDashboard({ ride, onBack }: { ride: RideHook; onBack: () => void }) {
   const { location, isLocating, locationError } = useGeolocation()
   const [tab, setTab] = useState<'book' | 'history'>('book')
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

   useEffect(() => {
      setDestinationInput(ride.selectedDestination.label)
      setDestinationLocation(ride.selectedDestination)
   }, [ride.selectedDestination])

   const distanceKm = useMemo(
      () => calculateDistanceKm(pickupLocation, destinationLocation),
      [pickupLocation, destinationLocation],
   )
   const estimatedFare = useMemo(
      () => BigInt(Math.max(100000, Math.round(distanceKm * 1000000 * ride.selectedVehicle.multiplier * 0.18))),
      [distanceKm, ride.selectedVehicle.multiplier],
   )

   const activeRide = useMemo(
      () => ride.customerRides.find(r =>
         r.status !== RideStatus.PAID && r.status !== RideStatus.RIDE_COMPLETED
      ),
      [ride.customerRides],
   )

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

   async function handleGenerateOtp(rideId: bigint) {
      const nextOtp = ride.generateOtp()
      await ride.storeOtp(rideId, nextOtp)
   }

   async function handleCreateRide() {
      try {
         await ride.createRide(pickupLocation, destinationLocation, estimatedFare)
         setShowSuccess(true)
         setTimeout(() => setShowSuccess(false), 3000)
      } catch (err) {
         // Error handled by hook toasts
      }
   }

   const showSuggestions = activeInput !== null && (
      (activeInput === 'pickup' && (pickupSuggestions.length > 0 || pickupSearchLoading)) ||
      (activeInput === 'drop' && (destinationSuggestions.length > 0 || destinationSearchLoading))
   )

   return (
      <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-[#06080b]">

         {/* ── Top nav bar (always visible) ── */}
         <div className="flex shrink-0 items-center justify-between gap-3 bg-black/80 px-4 py-3 backdrop-blur-xl sm:px-6">
            <button
               type="button"
               onClick={onBack}
               className="rounded-full border border-white/10 bg-white/6 p-2 text-white/72 transition hover:bg-white/10"
            >
               <ArrowLeft className="h-4 w-4" />
            </button>

            {/* Tab switcher */}
            <div className="flex items-center gap-1.5">
               <button
                  type="button"
                  onClick={() => setTab('book')}
                  className={cn(
                     'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition',
                     tab === 'book'
                        ? 'bg-white text-slate-950 shadow-[0_0_16px_rgba(255,255,255,0.2)]'
                        : 'border border-white/10 text-white/60 hover:text-white',
                  )}
               >
                  <CarFront className="h-3.5 w-3.5" />
                  Book
               </button>
               <button
                  type="button"
                  onClick={() => setTab('history')}
                  className={cn(
                     'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition',
                     tab === 'history'
                        ? 'bg-white text-slate-950 shadow-[0_0_16px_rgba(255,255,255,0.2)]'
                        : 'border border-white/10 text-white/60 hover:text-white',
                  )}
               >
                  <History className="h-3.5 w-3.5" />
                  My Rides
                  {ride.customerRides.length > 0 && (
                     <span className={cn(
                        'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                        tab === 'history' ? 'bg-slate-950/20 text-slate-900' : 'bg-white/15 text-white/80',
                     )}>
                        {ride.customerRides.length}
                     </span>
                  )}
               </button>
            </div>

            <WalletConnectButton />
         </div>

         <AnimatePresence mode="wait">

            {/* ══════════════════════ BOOK TAB ══════════════════════ */}
            {tab === 'book' && (
               <motion.div
                  key="book"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 lg:grid lg:grid-cols-[1.1fr_0.9fr] overflow-hidden"
               >
                  {/* Live Map - Left side on Desktop, Top on Mobile */}
                  <div className="relative h-[280px] lg:h-full lg:border-r lg:border-white/10">
                     <BookingMap
                        pickup={pickupLocation}
                        drop={destinationLocation}
                        selectionMode={mapSelectionMode}
                        onPickLocation={(coords, mode) => void handleMapPick(coords, mode)}
                     />

                     {/* Tap-to-set hint */}
                     {mapSelectionMode && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ zIndex: 900 }}>
                           <div className="rounded-full bg-black/75 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-xl" style={{ border: '1px solid rgba(255,255,255,0.18)' }}>
                              👆 Tap map to set {mapSelectionMode}
                           </div>
                        </div>
                     )}

                     {/* Cancel button */}
                     {mapSelectionMode && (
                        <button
                           type="button"
                           onClick={() => setMapSelectionMode(null)}
                           className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-xl transition hover:bg-black/90"
                           style={{ zIndex: 900 }}
                        >
                           <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                     )}

                     {/* A/B pill bar at bottom of map */}
                     {!mapSelectionMode && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2" style={{ zIndex: 900 }}>
                           <button
                              type="button"
                              onClick={() => setMapSelectionMode('pickup')}
                              className="flex items-center gap-2 rounded-full bg-black/75 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-xl transition hover:bg-emerald-500/80"
                              style={{ border: '1px solid rgba(255,255,255,0.18)' }}
                           >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-slate-950">A</span>
                              Pickup
                           </button>
                           <button
                              type="button"
                              onClick={() => setMapSelectionMode('drop')}
                              className="flex items-center gap-2 rounded-full bg-black/75 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-xl transition hover:bg-blue-500/80"
                              style={{ border: '1px solid rgba(255,255,255,0.18)' }}
                           >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-400 text-[10px] font-black text-slate-950">B</span>
                              Drop
                           </button>
                        </div>
                     )}
                  </div>

                  {/* Booking form — scrolls naturally below/beside the map */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
                     <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 pb-20 sm:px-6">

                     {/* Location notice */}
                     {locationError && (
                        <div className="rounded-[20px] border border-amber-300/18 bg-amber-300/10 p-3 text-sm text-amber-100">
                           {locationError}
                        </div>
                     )}

                     {/* Pickup + Destination unified card */}
                     <div className="overflow-hidden rounded-[22px] border border-white/8 bg-black/40 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
                        {/* Pickup row */}
                        <div
                           className={cn(
                              'flex cursor-text items-center gap-3 px-4 py-3 transition',
                              activeInput === 'pickup' ? 'bg-white/5' : 'hover:bg-white/[0.03]',
                           )}
                           onClick={() => setActiveInput('pickup')}
                        >
                           <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-slate-950">A</div>
                           <div className="min-w-0 flex-1">
                              <input
                                 value={pickupInput}
                                 onChange={(e) => { setPickupTouched(true); setPickupInput(e.target.value) }}
                                 onFocus={() => setActiveInput('pickup')}
                                 placeholder={isLocating ? 'Detecting location…' : 'Pickup location'}
                                 className="w-full bg-transparent text-sm font-medium text-white placeholder-white/38 outline-none"
                              />
                           </div>
                           {pickupInput && activeInput === 'pickup' && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); setPickupInput(''); setPickupTouched(false) }}>
                                 <X className="h-4 w-4 text-white/40" />
                              </button>
                           )}
                        </div>

                        {/* Connector line */}
                        <div className="flex items-center gap-3 pl-[29px] pr-4">
                           <div className="w-px flex-none self-stretch bg-white/10 mx-[3px]" style={{ marginLeft: 14 }} />
                           <div className="h-px flex-1 bg-white/8" />
                        </div>

                        {/* Drop row */}
                        <div
                           className={cn(
                              'flex cursor-text items-center gap-3 px-4 py-3 transition',
                              activeInput === 'drop' ? 'bg-white/5' : 'hover:bg-white/[0.03]',
                           )}
                           onClick={() => setActiveInput('drop')}
                        >
                           <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-400 text-[10px] font-black text-slate-950">B</div>
                           <div className="min-w-0 flex-1">
                              <input
                                 value={destinationInput}
                                 onChange={(e) => { setDestinationTouched(true); setDestinationInput(e.target.value) }}
                                 onFocus={() => { setActiveInput('drop'); setDestinationTouched(true) }}
                                 placeholder="Where to?"
                                 className="w-full bg-transparent text-sm font-medium text-white placeholder-white/38 outline-none"
                              />
                           </div>
                           {destinationInput && activeInput === 'drop' && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); setDestinationInput(''); setDestinationTouched(false) }}>
                                 <X className="h-4 w-4 text-white/40" />
                              </button>
                           )}
                        </div>

                        {/* Suggestions dropdown */}
                        {showSuggestions && (
                           <div className="border-t border-white/8 bg-black/60 px-2 py-2">
                              {activeInput === 'pickup' && (
                                 <>
                                    {pickupSearchLoading && (
                                       <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40">
                                          <LoaderCircle className="h-3 w-3 animate-spin" /> Searching…
                                       </div>
                                    )}
                                    <button
                                       type="button"
                                       onClick={() => selectPickup(location)}
                                       className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
                                    >
                                       <div className="rounded-full bg-emerald-400/15 p-1.5 text-emerald-300">
                                          <MapPin className="h-3.5 w-3.5" />
                                       </div>
                                       <p className="text-sm font-medium text-white">Use my current location</p>
                                    </button>
                                    {pickupSuggestions.map(option => (
                                       <button key={option.id} type="button" onClick={() => selectPickup(option)}
                                          className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition hover:bg-white/[0.06]">
                                          <div className="rounded-full bg-white/8 p-1.5 text-white/50">
                                             <MapPin className="h-3.5 w-3.5" />
                                          </div>
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
                                          <LoaderCircle className="h-3 w-3 animate-spin" /> Searching…
                                       </div>
                                    )}
                                    {destinationSuggestions.map(option => (
                                       <button key={option.id} type="button" onClick={() => selectDestination(option)}
                                          className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition hover:bg-white/[0.06]">
                                          <div className="rounded-full bg-white/8 p-1.5 text-white/50">
                                             <Search className="h-3.5 w-3.5" />
                                          </div>
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

                     {/* Vehicle options */}
                     {!showSuggestions && (
                        <>
                           <div className="grid gap-2">
                              {ride.vehicleOptions.map((vehicle) => {
                                 const fare = BigInt(Math.max(100000, Math.round(distanceKm * 1000000 * vehicle.multiplier * 0.18)))
                                 const selected = ride.selectedVehicleId === vehicle.id
                                 return (
                                    <button
                                       key={vehicle.id}
                                       type="button"
                                       onClick={() => ride.setSelectedVehicleId(vehicle.id)}
                                       className={cn(
                                          'flex items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-left transition',
                                          selected
                                             ? 'border-white/18 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.25)]'
                                             : 'border-white/8 bg-white/[0.04] hover:bg-white/[0.07]',
                                       )}
                                    >
                                       <div className="flex items-center gap-3">
                                          <div className={cn('rounded-[16px] p-2.5 text-white', vehicle.gradient)}>
                                             <CarFront className="h-5 w-5" />
                                          </div>
                                          <div>
                                             <p className="text-sm font-semibold text-white">{vehicle.name}</p>
                                             <p className="text-xs text-white/50">{vehicle.description}</p>
                                          </div>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-sm font-bold text-white">{ride.formatAlgoAmount(fare)}</p>
                                          <p className="text-xs text-white/50">{Math.max(4, Math.round(distanceKm * 2.4))} min</p>
                                       </div>
                                    </button>
                                 )
                              })}
                           </div>

                           {/* Trip summary */}
                           <div className="grid grid-cols-3 gap-2 rounded-[20px] border border-white/8 bg-black/30 p-4">
                              <div>
                                 <p className="text-[10px] uppercase tracking-widest text-white/35">Distance</p>
                                 <p className="mt-1.5 text-sm font-bold text-white">{distanceKm.toFixed(1)} km</p>
                              </div>
                              <div>
                                 <p className="text-[10px] uppercase tracking-widest text-white/35">ETA</p>
                                 <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-bold text-white">
                                    <Clock3 className="h-3.5 w-3.5 text-white/40" />
                                    {Math.max(4, Math.round(distanceKm * 2.4))}m
                                 </p>
                              </div>
                              <div>
                                 <p className="text-[10px] uppercase tracking-widest text-white/35">Fare</p>
                                 <p className="mt-1.5 text-sm font-bold text-white">{ride.formatAlgoAmount(estimatedFare)}</p>
                              </div>
                           </div>

                           {/* Create ride CTA */}
                           <button
                              type="button"
                              disabled={!ride.activeAddress || ride.actionState.createRide || isLocating}
                              onClick={() => void handleCreateRide()}
                              className="flex w-full items-center justify-center gap-3 rounded-[22px] bg-gradient-to-r from-white via-white to-slate-200 px-5 py-4 text-base font-black text-slate-950 shadow-[0_0_24px_rgba(255,255,255,0.15)] transition hover:scale-[1.02] hover:shadow-[0_0_32px_rgba(255,255,255,0.25)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
                           >
                              {ride.actionState.createRide ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
                              {ride.actionState.createRide ? 'Creating ride…' : `Book ${ride.selectedVehicle.name}`}
                           </button>
                        </>
                     )}

                     {/* Active ride status */}
                     {activeRide && !showSuggestions && (
                        <motion.div
                           initial={{ opacity: 0, y: 12 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="rounded-[22px] border border-white/12 bg-white/5 p-4"
                        >
                           <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                 <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Active ride</p>
                                 <p className="mt-1 text-base font-black text-white">Ride #{activeRide.rideId.toString()}</p>
                                 <p className="mt-0.5 truncate text-xs text-white/50">{activeRide.pickup.label} → {activeRide.drop.label}</p>
                              </div>
                              <span className={cn(
                                 'shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide',
                                 activeRide.status === RideStatus.REQUESTED && 'bg-amber-300/15 text-amber-300',
                                 activeRide.status === RideStatus.RIDER_ASSIGNED && 'bg-emerald-300/15 text-emerald-300',
                                 activeRide.status === RideStatus.RIDE_STARTED && 'bg-sky-300/15 text-sky-300',
                              )}>
                                 {activeRide.status}
                              </span>
                           </div>

                           {activeRide.status === RideStatus.RIDER_ASSIGNED && (
                              <div className="mt-3 rounded-[18px] bg-emerald-400/10 p-3">
                                 <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                                    <p className="text-sm font-semibold text-white">Share OTP with driver</p>
                                 </div>
                                 <div className="mt-2 flex items-center gap-3">
                                    <button
                                       type="button"
                                       onClick={() => void handleGenerateOtp(activeRide.rideId)}
                                       disabled={ride.actionState.storeOtp}
                                       className="rounded-[14px] bg-gradient-to-r from-emerald-300 to-cyan-400 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-45"
                                    >
                                       {ride.actionState.storeOtp ? 'Generating…' : activeRide.otp ? 'Regen OTP' : 'Generate OTP'}
                                    </button>
                                    {activeRide.otp && (
                                       <span className="font-mono text-2xl font-black tracking-[0.3em] text-white">{activeRide.otp}</span>
                                    )}
                                 </div>
                              </div>
                           )}

                           {activeRide.status === RideStatus.RIDE_STARTED && (
                              <div className="mt-3 flex items-center gap-2 rounded-[18px] bg-sky-300/10 p-3 text-sm text-white/80">
                                 <UserRound className="h-4 w-4 text-sky-300" />
                                 Ride in progress · Escrow locked
                              </div>
                           )}
                        </motion.div>
                     )}
                  </div>
               </div>
            </motion.div>
         )}

         {/* ══════════════════════ HISTORY TAB ══════════════════════ */}
         {tab === 'history' && (
            <motion.div
               key="history"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="flex-1 overflow-y-auto"
            >
               <div className="mx-auto w-full max-w-2xl space-y-3 px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xl font-black tracking-[-0.04em] text-white">Ride history</h3>
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

                  <AnimatePresence initial={false}>
                     {ride.customerRides.map((item) => (
                        <motion.button
                           key={item.rideId.toString()}
                           type="button"
                           layout
                           initial={{ opacity: 0, y: 15 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.95 }}
                           onClick={() => ride.setFocusedRideId(item.rideId)}
                           className={cn(
                              'w-full rounded-[24px] border p-4 text-left transition hover:scale-[1.01]',
                              ride.focusedRideId === item.rideId
                                 ? 'border-white/20 bg-white/10'
                                 : 'border-white/8 bg-white/[0.04] hover:bg-white/[0.06]',
                           )}
                        >
                           <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                 <p className="text-sm font-semibold text-white">Ride #{item.rideId.toString()}</p>
                                 <p className="mt-1 truncate text-xs text-white/48">{item.pickup.label} → {item.drop.label}</p>
                              </div>
                              <div className={cn(
                                 'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                                 item.status === RideStatus.PAID || item.status === RideStatus.RIDE_COMPLETED
                                    ? 'border border-white/8 bg-black/20 text-white/50'
                                    : 'border border-emerald-300/20 bg-emerald-300/10 text-emerald-300',
                              )}>
                                 {item.status === RideStatus.PAID
                                    ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</span>
                                    : item.status
                                 }
                              </div>
                           </div>

                           {item.status === RideStatus.RIDER_ASSIGNED && (
                              <div className="mt-3 rounded-[18px] border border-emerald-300/18 bg-emerald-300/10 p-3">
                                 <p className="text-xs font-semibold text-white">OTP: <span className="font-mono tracking-widest">{item.otp ?? 'Not generated'}</span></p>
                                 <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); void handleGenerateOtp(item.rideId) }}
                                    disabled={ride.actionState.storeOtp}
                                    className="mt-2 rounded-[14px] bg-gradient-to-r from-emerald-300 to-cyan-400 px-3 py-1.5 text-xs font-black text-slate-950 disabled:opacity-45"
                                 >
                                    {item.otp ? 'Regenerate OTP' : 'Generate OTP'}
                                 </button>
                              </div>
                           )}

                           {item.status === RideStatus.RIDE_COMPLETED && (
                              <button
                                 type="button"
                                 onClick={(e) => { e.stopPropagation(); void ride.releasePayment(item.rideId) }}
                                 disabled={ride.actionState.releasePayment}
                                 className="mt-3 rounded-[18px] bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-45"
                              >
                                 Release payment
                              </button>
                           )}
                        </motion.button>
                     ))}
                  </AnimatePresence>

                  {!ride.customerRides.length && (
                     <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-sm text-white/54">
                        No rides yet. Book from the <strong className="text-white/80">Book</strong> tab!
                     </div>
                  )}
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Success Animation Overlay */}
      <AnimatePresence>
         {showSuccess && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-emerald-950/80 backdrop-blur-md"
            >
               <motion.div
                  initial={{ scale: 0.5, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-[0_0_50px_rgba(52,211,153,0.5)]"
               >
                  <ShieldCheck className="h-16 w-16" />
               </motion.div>
               <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8 text-4xl font-black text-white"
               >
                  Ride Requested!
               </motion.h2>
               <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-2 text-emerald-200/60"
               >
                  Waiting for a driver to accept...
               </motion.p>
            </motion.div>
         )}
      </AnimatePresence>
   </div>
 )
}
