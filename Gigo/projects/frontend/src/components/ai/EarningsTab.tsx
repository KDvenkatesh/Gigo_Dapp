import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Loader2, RefreshCw, TrendingUp, AlertCircle, Banknote, Navigation, Calendar } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useX402 } from '../../hooks/useX402'
import { cn } from '../../lib/cn'
import { calculateDistanceKm } from '../../lib/location'
import type { useRideContract } from '../../hooks/useRideContract'
import { RideStatus } from '../../types/ride'

type RideHook = ReturnType<typeof useRideContract>

interface EarningsInsight {
  total_earnings_algo: number;
  completed_rides: number;
  average_fare: number;
  total_distance_km: number;
  hotspots: Array<{ name: string; demand_level: 'HIGH' | 'MEDIUM' | 'LOW' }>;
  driving_strategy: string;
}

export function EarningsTab({ ride }: { ride: RideHook }) {
  const { callX402API, isWalletReady } = useX402()
  const [insight, setInsight] = useState<EarningsInsight | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const completedRidesLocal = ride.driverRides.filter(
    r => r.status === RideStatus.RIDE_COMPLETED || r.status === RideStatus.PAID
  )
  const totalEarnedLocal = completedRidesLocal.reduce(
    (acc, r) => acc + Number(r.fareMicroAlgos) / 1000000,
    0
  )
  const totalDistanceLocal = completedRidesLocal.reduce(
    (acc, r) => acc + calculateDistanceKm(r.pickup, r.drop),
    0
  )
  const avgFareLocal = completedRidesLocal.length > 0 
    ? totalEarnedLocal / completedRidesLocal.length 
    : 0

  const fetchInsight = useCallback(async () => {
    if (!ride.activeAddress || !isWalletReady) return

    setIsLoading(true)
    setError(null)

    try {
      // Collect driver's completed rides from history
      const completedRides = completedRidesLocal.map(r => ({
        ride_id: r.rideId.toString(),
        pickup: r.pickup.label,
        drop: r.drop.label,
        fare: Number(r.fareMicroAlgos) / 1000000,
        distance_km: calculateDistanceKm(r.pickup, r.drop),
        time: new Date().toISOString(),
        duration_minutes: 15, // Mock duration for AI
      }))

      const data = await callX402API<{ success: boolean; insight: EarningsInsight }>(
        '/api/earnings-insight',
        {
          driver_id: ride.activeAddress,
          rides_this_week: completedRides,
        }
      )
      
      setInsight(data.insight)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze earnings')
    } finally {
      setIsLoading(false)
    }
  }, [ride.activeAddress, completedRidesLocal, isWalletReady, callX402API])

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-8 overflow-y-auto pb-20">
      {/* Overview Stats */}
      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] border border-white/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/38">Earnings Overview</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">Your Performance</h2>
          
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
              <Banknote className="h-5 w-5 text-emerald-400" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400/50">Total Earned</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">
                {insight 
                  ? `${insight.total_earnings_algo.toFixed(2)} ALGO` 
                  : `${totalEarnedLocal.toFixed(2)} ALGO`}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
              <TrendingUp className="h-5 w-5 text-sky-400" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Avg Fare</p>
              <p className="mt-1 text-xl font-bold text-white">
                {insight 
                  ? `${insight.average_fare.toFixed(2)} ALGO` 
                  : `${avgFareLocal.toFixed(2)} ALGO`}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
              <Navigation className="h-5 w-5 text-white/50" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Total Distance</p>
              <p className="mt-1 text-xl font-bold text-white">
                {insight 
                  ? `${insight.total_distance_km.toFixed(1)} km` 
                  : `${totalDistanceLocal.toFixed(1)} km`}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
              <Calendar className="h-5 w-5 text-white/50" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Completed</p>
              <p className="mt-1 text-xl font-bold text-white">
                {insight ? insight.completed_rides : completedRidesLocal.length}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* AI Insights */}
      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] border border-indigo-500/15 bg-gradient-to-b from-indigo-500/5 to-transparent p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-indigo-500/20 text-indigo-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Earnings Insight</h3>
                <p className="text-xs text-white/40">Analyze your driving patterns for 0.002 ALGO</p>
              </div>
            </div>
            <button
              onClick={() => void fetchInsight()}
              disabled={isLoading || !isWalletReady}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              {insight ? 'Refresh' : 'Analyze'}
            </button>
          </div>

          <div className="mt-6 min-h-[150px]">
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-3 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                  <p className="text-sm text-white/50">Analyzing route history and local demand...</p>
                </motion.div>
              )}

              {!isLoading && error && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start gap-3 rounded-2xl bg-rose-500/10 p-4">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                  <p className="text-sm text-rose-200">{error}</p>
                </motion.div>
              )}

              {!isLoading && !error && !insight && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-2 py-8 text-center text-white/30">
                  <Navigation className="h-8 w-8 opacity-20" />
                  <p className="text-sm">Click Analyze to generate your custom driving strategy.</p>
                </motion.div>
              )}

              {!isLoading && insight && (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/80">
                    <span className="font-semibold text-indigo-300">Strategy: </span>
                    {insight.driving_strategy}
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">Hotspots</p>
                    <div className="flex flex-wrap gap-2">
                      {insight.hotspots.map((h, i) => (
                        <div key={i} className={cn(
                          'rounded-xl border px-3 py-1.5 text-xs font-semibold',
                          h.demand_level === 'HIGH' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                          h.demand_level === 'MEDIUM' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                          'border-white/10 bg-white/5 text-white/50'
                        )}>
                          {h.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
