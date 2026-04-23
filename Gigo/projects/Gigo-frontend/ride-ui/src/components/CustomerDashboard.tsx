import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CarFront, CheckCircle2, Clock3, Gem, History, Loader2, LoaderCircle, MapPin, RefreshCw, Search, ShieldCheck, Trash2, UserRound, X, Zap } from 'lucide-react'
import { WalletConnectButton } from './WalletConnectButton'
import { NFTPassCard } from './NFTPassCard'
import { BookingMap } from './BookingMap'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAlgorandAssets, type PassTier } from '../hooks/useAlgorandAssets'
import { usePlaceSearch, reverseGeocodeLocation } from '../hooks/usePlaceSearch'
import { calculateDistanceKm } from '../lib/location'
import { cn } from '../lib/cn'
import { RideStatus, type PlaceSuggestion, type RideLocation } from '../types/ride'
import type { useRideContract } from '../hooks/useRideContract'
import { useEffect, useMemo, useState } from 'react'

type RideHook = ReturnType<typeof useRideContract>

export function CustomerDashboard({ ride, onBack }: { ride: RideHook; onBack: () => void }) {
   const { location, isLocating, locationError } = useGeolocation()
   const passData = useAlgorandAssets()
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
   const discountedFare = useMemo(
      () => passData.applyDiscount(estimatedFare),
      [estimatedFare, passData.applyDiscount],
   )
   const hasActivePass = Boolean(passData.activePass && passData.activePass.isActive)

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
         const fareToCharge = hasActivePass ? discountedFare : estimatedFare
         await ride.createRide(pickupLocation, destinationLocation, fareToCharge)
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
      <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-[#05060a]">

         {/* ── Top nav bar ── */}
         <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#05060a]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
            <button
               type="button"
               onClick={onBack}
               className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-white/60 transition hover:bg-white/[0.06]"
            >
               <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
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
                        'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition',
                        tab === t.id
                           ? 'bg-white text-[#05060a]'
                           : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
                     )}
                  >
                     <t.icon className="h-3.5 w-3.5" />
                     {t.label}
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
                  {/* Map */}
                  <div className="relative h-[280px] lg:h-full lg:border-r lg:border-white/[0.06]">
                     <BookingMap
                        pickup={pickupLocation}
                        drop={destinationLocation}
                        selectionMode={mapSelectionMode}
                        onPickLocation={(coords, mode) => void handleMapPick(coords, mode)}
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

                  {/* Booking form */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#05060a]">
                     <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 pb-20 sm:px-6">

                     {locationError && (
                        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.06] p-3 text-sm text-amber-200/80">
                           {locationError}
                        </div>
                     )}

                     {/* Pickup + Destination */}
                     <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
                        <div
                           className={cn('flex cursor-text items-center gap-3 px-4 py-3 transition', activeInput === 'pickup' ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]')}
                           onClick={() => setActiveInput('pickup')}
                        >
                           <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-bold text-slate-950">A</div>
                           <input
                              value={pickupInput}
                              onChange={(e) => { setPickupTouched(true); setPickupInput(e.target.value) }}
                              onFocus={() => setActiveInput('pickup')}
                              placeholder={isLocating ? 'Detecting location\u2026' : 'Pickup location'}
                              className="w-full bg-transparent text-sm font-medium text-white placeholder-white/30 outline-none"
                           />
                           {pickupInput && activeInput === 'pickup' && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); setPickupInput(''); setPickupTouched(false) }}>
                                 <X className="h-4 w-4 text-white/30" />
                              </button>
                           )}
                        </div>
                        <div className="mx-4 h-px bg-white/[0.06]" />
                        <div
                           className={cn('flex cursor-text items-center gap-3 px-4 py-3 transition', activeInput === 'drop' ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]')}
                           onClick={() => setActiveInput('drop')}
                        >
                           <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-400 text-[9px] font-bold text-slate-950">B</div>
                           <input
                              value={destinationInput}
                              onChange={(e) => { setDestinationTouched(true); setDestinationInput(e.target.value) }}
                              onFocus={() => { setActiveInput('drop'); setDestinationTouched(true) }}
                              placeholder="Where to?"
                              className="w-full bg-transparent text-sm font-medium text-white placeholder-white/30 outline-none"
                           />
                           {destinationInput && activeInput === 'drop' && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); setDestinationInput(''); setDestinationTouched(false) }}>
                                 <X className="h-4 w-4 text-white/30" />
                              </button>
                           )}
                        </div>

                        {showSuggestions && (
                           <div className="border-t border-white/[0.06] bg-[#05060a] px-2 py-2">
                              {activeInput === 'pickup' && (
                                 <>
                                    {pickupSearchLoading && (
                                       <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40">
                                          <LoaderCircle className="h-3 w-3 animate-spin" /> Searching{'\u2026'}
                                       </div>
                                    )}
                                    <button type="button" onClick={() => selectPickup(location)}
                                       className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.04]">
                                       <div className="rounded-full bg-emerald-400/10 p-1.5 text-emerald-400"><MapPin className="h-3.5 w-3.5" /></div>
                                       <p className="text-sm font-medium text-white">Use my current location</p>
                                    </button>
                                    {pickupSuggestions.map(option => (
                                       <button key={option.id} type="button" onClick={() => selectPickup(option)}
                                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.04]">
                                          <div className="rounded-full bg-white/[0.06] p-1.5 text-white/40"><MapPin className="h-3.5 w-3.5" /></div>
                                          <div className="min-w-0">
                                             <p className="truncate text-sm font-medium text-white">{option.label}</p>
                                             <p className="truncate text-xs text-white/40">{option.secondaryLabel}</p>
                                          </div>
                                       </button>
                                    ))}
                                 </>
                              )}
                              {activeInput === 'drop' && (
                                 <>
                                    {destinationSearchLoading && (
                                       <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40">
                                          <LoaderCircle className="h-3 w-3 animate-spin" /> Searching{'\u2026'}
                                       </div>
                                    )}
                                    {destinationSuggestions.map(option => (
                                       <button key={option.id} type="button" onClick={() => selectDestination(option)}
                                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.04]">
                                          <div className="rounded-full bg-white/[0.06] p-1.5 text-white/40"><Search className="h-3.5 w-3.5" /></div>
                                          <div className="min-w-0">
                                             <p className="truncate text-sm font-medium text-white">{option.label}</p>
                                             <p className="truncate text-xs text-white/40">{option.secondaryLabel}</p>
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
                                          'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition',
                                          selected
                                             ? 'border-white/[0.15] bg-white/[0.06]'
                                             : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]',
                                       )}
                                    >
                                       <div className="flex items-center gap-3">
                                          <div className={cn('rounded-xl p-2.5 text-white', vehicle.gradient)}>
                                             <CarFront className="h-5 w-5" />
                                          </div>
                                          <div>
                                             <p className="text-sm font-medium text-white">{vehicle.name}</p>
                                             <p className="text-xs text-white/40">{vehicle.description}</p>
                                          </div>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-sm font-semibold text-white">{ride.formatAlgoAmount(fare)}</p>
                                          <p className="text-xs text-white/40">{Math.max(4, Math.round(distanceKm * 2.4))} min</p>
                                       </div>
                                    </button>
                                 )
                              })}
                           </div>

                           {/* Trip summary */}
                           <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
                              <div className="bg-[#05060a] p-3.5">
                                 <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Distance</p>
                                 <p className="mt-1 text-sm font-semibold text-white">{distanceKm.toFixed(1)} km</p>
                              </div>
                              <div className="bg-[#05060a] p-3.5">
                                 <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">ETA</p>
                                 <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-white">
                                    <Clock3 className="h-3.5 w-3.5 text-white/35" />
                                    {Math.max(4, Math.round(distanceKm * 2.4))}m
                                 </p>
                              </div>
                              <div className="bg-[#05060a] p-3.5">
                                 <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Fare</p>
                                 {hasActivePass && discountedFare < estimatedFare ? (
                                    <div className="mt-1">
                                       <p className="text-sm font-semibold text-white">{ride.formatAlgoAmount(discountedFare)}</p>
                                       <p className="text-[10px] text-white/25 line-through">{ride.formatAlgoAmount(estimatedFare)}</p>
                                       <p className="mt-1 text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{passData.activePass!.discount}% Pass applied</p>
                                    </div>
                                 ) : (
                                    <p className="mt-1 text-sm font-semibold text-white">{ride.formatAlgoAmount(estimatedFare)}</p>
                                 )}
                              </div>
                           </div>

                           {/* Book CTA */}
                           <button
                              type="button"
                              disabled={!ride.activeAddress || ride.actionState.createRide || isLocating}
                              onClick={() => void handleCreateRide()}
                              className={cn(
                                 'flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-[15px] font-semibold transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100',
                                 'bg-white text-[#05060a]',
                              )}
                           >
                              {ride.actionState.createRide ? (
                                 <LoaderCircle className="h-4.5 w-4.5 animate-spin" />
                              ) : (
                                 <CarFront className="h-4.5 w-4.5" />
                              )}
                              {ride.actionState.createRide
                                 ? 'Creating ride\u2026'
                                 : `Book ${ride.selectedVehicle.name}`
                              }
                           </button>
                        </>
                     )}

                     {/* Active ride status */}
                     {activeRide && !showSuggestions && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                           className="rounded-xl border border-white/[0.1] bg-white/[0.03] p-4">
                           <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                 <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Active ride</p>
                                 <p className="mt-1 text-base font-semibold text-white">Ride #{activeRide.rideId.toString()}</p>
                                 <p className="mt-0.5 truncate text-xs text-white/40">{activeRide.pickup.label} {'\u2192'} {activeRide.drop.label}</p>
                              </div>
                              <span className={cn(
                                 'shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
                                 activeRide.status === RideStatus.REQUESTED && 'bg-amber-500/10 text-amber-400',
                                 activeRide.status === RideStatus.RIDER_ASSIGNED && 'bg-emerald-500/10 text-emerald-400',
                                 activeRide.status === RideStatus.RIDE_STARTED && 'bg-sky-500/10 text-sky-400',
                              )}>
                                 {activeRide.status}
                              </span>
                           </div>
                           {activeRide.status === RideStatus.RIDER_ASSIGNED && (
                              <div className="mt-3 rounded-lg bg-emerald-500/[0.06] p-3">
                                 <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                    <p className="text-sm font-medium text-white">Share OTP with driver</p>
                                 </div>
                                 <div className="mt-2 flex items-center gap-3">
                                    <button type="button" onClick={() => void handleGenerateOtp(activeRide.rideId)}
                                       disabled={ride.actionState.storeOtp}
                                       className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-45">
                                       {ride.actionState.storeOtp ? 'Generating\u2026' : activeRide.otp ? 'Regen OTP' : 'Generate OTP'}
                                    </button>
                                    {activeRide.otp && (
                                       <span className="font-mono text-2xl font-bold tracking-[0.3em] text-white">{activeRide.otp}</span>
                                    )}
                                 </div>
                              </div>
                           )}
                           {activeRide.status === RideStatus.RIDE_STARTED && (
                              <div className="mt-3 flex items-center gap-2 rounded-lg bg-sky-500/[0.06] p-3 text-sm text-white/70">
                                 <UserRound className="h-4 w-4 text-sky-400" />
                                 Ride in progress {'\u00B7'} Escrow locked
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
                        <motion.button key={item.rideId.toString()} type="button" layout
                           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                           onClick={() => ride.setFocusedRideId(item.rideId)}
                           className={cn(
                              'w-full rounded-xl border p-4 text-left transition',
                              ride.focusedRideId === item.rideId
                                 ? 'border-white/[0.15] bg-white/[0.06]'
                                 : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]',
                           )}>
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
                           {item.status === RideStatus.RIDER_ASSIGNED && (
                              <div className="mt-3 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.05] p-3">
                                 <p className="text-xs font-medium text-white">OTP: <span className="font-mono tracking-widest">{item.otp ?? 'Not generated'}</span></p>
                                 <button type="button" onClick={(e) => { e.stopPropagation(); void handleGenerateOtp(item.rideId) }}
                                    disabled={ride.actionState.storeOtp}
                                    className="mt-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-45">
                                    {item.otp ? 'Regenerate OTP' : 'Generate OTP'}
                                 </button>
                              </div>
                           )}
                           {item.status === RideStatus.RIDE_COMPLETED && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); void ride.releasePayment(item.rideId) }}
                                 disabled={ride.actionState.releasePayment}
                                 className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#05060a] disabled:opacity-45">
                                 Release payment
                              </button>
                           )}
                        </motion.button>
                     ))}
                  </AnimatePresence>

                  {!ride.customerRides.length && (
                     <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center text-sm text-white/40">
                        No rides yet. Book from the <strong className="text-white/60">Book</strong> tab.
                     </div>
                  )}
               </div>
            </motion.div>
         )}

         {/* ══════════════════════ PASSES TAB ══════════════════════ */}
         {tab === 'passes' && (
            <PassesTabContent />
         )}
      </AnimatePresence>

      {/* Success overlay */}
      <AnimatePresence>
         {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#05060a]/90 backdrop-blur-md">
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
                  Waiting for a driver to accept...
               </motion.p>
            </motion.div>
         )}
      </AnimatePresence>
   </div>
 )
}

// ── Passes Tab ──
function PassesTabContent() {
   const { passes, activeTier, isLoading, error, refetch, hasPriorityMatching, hasZeroSurge } = useAlgorandAssets()

   const tierNames: Record<PassTier, string> = { silver: 'Silver', gold: 'Gold', platinum: 'Platinum' }

   return (
      <motion.div key="passes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
         className="flex-1 overflow-y-auto">
         <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
               <h2 className="text-2xl font-bold text-white sm:text-3xl">Your Passes</h2>
               <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/40">
                  NFT-powered ride passes on Algorand. Get automatic discounts on every ride.
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
                           onBuyPass={() => window.open(`https://testnet.explorer.perawallet.app/asset/${pass.assetId}/`, '_blank')}
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
                        { n: '01', t: 'Opt-in', d: 'Opt-in to a Gigo pass NFT (ASA) via Pera Wallet.' },
                        { n: '02', t: 'Auto-verified', d: 'We detect ownership and activate your pass instantly.' },
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
      </motion.div>
   )
}
