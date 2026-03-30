import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, CheckCircle2, KeyRound, LoaderCircle, MapPinned, RefreshCw, ShieldAlert, Timer, Trash2 } from 'lucide-react'
import { WalletConnectButton } from './WalletConnectButton'
import { BottomSheet } from './BottomSheet'
import { LiveMap } from './LiveMap'
import { OTPModal } from './OTPModal'
import { cn } from '../lib/cn'
import { RideStatus } from '../types/ride'
import type { useRideContract } from '../hooks/useRideContract'
import { useState } from 'react'
import { useGeolocation } from '../hooks/useGeolocation'

type RideHook = ReturnType<typeof useRideContract>

export function DriverDashboard({ ride, onBack }: { ride: RideHook; onBack: () => void }) {
  const activeRide = ride.focusedRide
  const { location: driverLocation } = useGeolocation()
  const [otpOpen, setOtpOpen] = useState(false)
  const [otp, setOtp] = useState('')

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
        <div className="mx-auto grid w-full gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-[32px] border border-white/10 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/38">Driver dashboard</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">
                    Accept rides and track pickup.
                  </h2>
                </div>
                <div className="flex shrink-0 items-center justify-start gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/72 transition hover:bg-white/10"
                  >
                    <span className="inline-flex items-center gap-2">
                       <ArrowLeft className="h-4 w-4" />
                       Back
                    </span>
                  </button>
                  <WalletConnectButton />
                </div>
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
                                setOtp(item.otp ?? '')
                              }}
                              className="rounded-[22px] bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-400 px-4 py-3 text-sm font-black text-slate-950"
                              disabled={!item.otp}
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
              </div>
            </motion.div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <LiveMap
                pickup={mapOrigin}
                drop={mapDestination}
                title={activeRide ? `Tracking Ride #${activeRide.rideId}` : "Driver Network Map"}
                subtitle={activeRide ? `Route: ${activeRide.status === RideStatus.RIDE_STARTED ? 'Destination' : 'Pickup'}` : "Real-time visibility of available requests."}
              />
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
                          {activeRide.otp
                            ? `Ask the customer to tell you this OTP at pickup, then verify it to start the ride: ${activeRide.otp}`
                            : 'Waiting for the customer to generate and share the OTP.'}
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
      </BottomSheet>

      <OTPModal
        isOpen={otpOpen}
        isLoading={ride.actionState.startRide}
        otp={otp}
        expectedOtp={activeRide?.otp ?? 'Generate OTP first'}
        onOtpChange={setOtp}
        onClose={() => setOtpOpen(false)}
        onVerify={() => void handleVerifyOtp()}
      />
    </>
  )
}
