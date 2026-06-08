import { motion } from 'framer-motion'
import { CarFront, MapPin, Navigation } from 'lucide-react'
import { RideStatus } from '../types/ride'

interface MapViewProps {
  status: RideStatus
  pickup: string
  drop: string
  driverAssigned: boolean
}

const routeGlowByStatus: Record<RideStatus, string> = {
  IDLE: 'from-white/0 via-white/0 to-white/0',
  REQUESTED: 'from-amber-400/0 via-amber-300/60 to-amber-400/0',
  RIDER_ASSIGNED: 'from-emerald-400/0 via-emerald-300/80 to-emerald-400/0',
  DRIVER_ARRIVED: 'from-emerald-400/0 via-emerald-300/85 to-emerald-400/0',
  RIDE_STARTED: 'from-sky-400/0 via-sky-300/80 to-sky-400/0',
  DROPPED_OFF: 'from-sky-400/0 via-sky-300/90 to-sky-400/0',
  RIDE_COMPLETED: 'from-emerald-400/0 via-emerald-300/90 to-emerald-400/0',
  PAID: 'from-violet-400/0 via-violet-300/85 to-violet-400/0',
  CANCELLED: 'from-red-400/0 via-red-400/60 to-red-400/0',
}

export function MapView({ status, pickup, drop, driverAssigned }: MapViewProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_0,transparent_20%),radial-gradient(circle_at_80%_0%,rgba(110,231,183,0.14),transparent_22%),linear-gradient(180deg,#0a0c10_0%,#06070a_100%)]" />
      <div className="map-grid absolute inset-0 opacity-70" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent_22%,transparent_72%,rgba(255,255,255,0.03)),linear-gradient(180deg,transparent_0%,rgba(5,7,10,0.1)_40%,rgba(5,7,10,0.84)_100%)]" />

      <motion.div
        initial={{ opacity: 0.4 }}
        animate={{ opacity: status === RideStatus.IDLE ? 0.45 : 0.82 }}
        className={`absolute left-[14%] top-[23%] h-[3px] w-[72%] rounded-full bg-gradient-to-r ${routeGlowByStatus[status]} blur-[1px]`}
      />
      <motion.div
        initial={{ scaleX: 0.3, opacity: 0.35 }}
        animate={{ scaleX: status === RideStatus.IDLE ? 0.45 : 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        className="absolute left-[14%] top-[23%] h-[3px] w-[72%] origin-left rounded-full bg-gradient-to-r from-transparent via-white/45 to-transparent"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="absolute left-[12%] top-[19%]"
      >
        <div className="rounded-full border border-emerald-300/30 bg-emerald-400/15 p-2 shadow-[0_0_0_12px_rgba(52,211,153,0.06)] backdrop-blur-md">
          <MapPin className="h-5 w-5 text-emerald-300" />
        </div>
        <p className="mt-2 max-w-32 text-[11px] font-medium text-white/65">{pickup || 'Pickup point'}</p>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="absolute right-[11%] top-[16%]"
      >
        <div className="rounded-full border border-white/15 bg-black/35 p-2 shadow-[0_0_0_12px_rgba(255,255,255,0.04)] backdrop-blur-md">
          <Navigation className="h-5 w-5 text-white" />
        </div>
        <p className="mt-2 max-w-32 text-right text-[11px] font-medium text-white/65">{drop || 'Drop location'}</p>
      </motion.div>

      <motion.div
        animate={
          driverAssigned
            ? { left: ['16%', '44%', '70%'], top: ['56%', '40%', status === RideStatus.RIDE_STARTED ? '22%' : '30%'] }
            : { left: '16%', top: '56%' }
        }
        transition={{
          duration: status === RideStatus.RIDE_STARTED ? 6 : 2.2,
          ease: 'easeInOut',
        }}
        className="absolute"
      >
        <div className="rounded-[22px] border border-white/12 bg-white/10 p-3 shadow-[0_14px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <CarFront className="h-6 w-6 text-white" />
        </div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#05070a] via-[#05070acc] to-transparent" />
    </div>
  )
}
