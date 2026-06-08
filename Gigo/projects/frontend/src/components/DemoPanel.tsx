import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, X, Code2, Cpu, Activity, Hash, CloudLightning } from 'lucide-react'
import type { RideRecord } from '../types/ride'

interface DemoPanelProps {
  activeRide: RideRecord | null
}

export function DemoPanel({ activeRide }: DemoPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const formatAlgos = (micro: number | string | bigint | undefined) => {
    if (!micro) return '0.00 GIGC'
    return (Number(micro) / 1_000_000).toFixed(2) + ' GIGC'
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-300 shadow-xl backdrop-blur-md border border-white/10 hover:bg-slate-800 hover:text-white transition-all group"
      >
        <Terminal className="h-4 w-4 text-emerald-400 group-hover:animate-pulse" />
        <span className="hidden sm:inline">Demo Panel</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-6 z-50 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-emerald-400" />
                <h3 className="font-mono text-sm font-semibold text-emerald-400">Admin Debug Panel</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 font-mono text-xs text-slate-300 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {!activeRide ? (
                <div className="text-center text-slate-500 py-4">No active ride selected.</div>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Activity className="h-3 w-3" />
                      <span className="uppercase tracking-wider font-bold">State Engine</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded bg-black/40 px-3 py-2 border border-white/5">
                        <div className="text-[10px] text-slate-500 mb-0.5">Ride ID</div>
                        <div className="truncate text-emerald-300">{activeRide.rideId.toString()}</div>
                      </div>
                      <div className="rounded bg-black/40 px-3 py-2 border border-white/5">
                        <div className="text-[10px] text-slate-500 mb-0.5">Status</div>
                        <div className="truncate text-sky-400">{activeRide.status}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <CloudLightning className="h-3 w-3" />
                      <span className="uppercase tracking-wider font-bold">Dynamic Pricing Matrix</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center rounded bg-black/40 px-3 py-2 border border-white/5">
                        <span className="text-slate-400">Base Fare Est.</span>
                        <span className="text-white">{formatAlgos(activeRide.fareMicroAlgos)}</span>
                      </div>
                      <div className="flex justify-between items-center rounded bg-black/40 px-3 py-2 border border-white/5">
                        <span className="text-slate-400">Weather Surge</span>
                        <span className="text-amber-400">{activeRide.weatherMultiplier ? `${activeRide.weatherMultiplier}x` : '1.0x (Normal)'}</span>
                      </div>
                      <div className="flex justify-between items-center rounded bg-black/40 px-3 py-2 border border-white/5">
                        <span className="text-slate-400">Wait Time Fee</span>
                        <span className="text-rose-400">{activeRide.waitTimeFee ? formatAlgos(activeRide.waitTimeFee) : '0.00 GIGC'}</span>
                      </div>
                      <div className="flex justify-between items-center rounded bg-black/40 px-3 py-2 border border-white/5">
                        <span className="text-slate-400">Traffic Delay Fee</span>
                        <span className="text-orange-400">{activeRide.trafficDelayFee ? formatAlgos(activeRide.trafficDelayFee) : '0.00 GIGC'}</span>
                      </div>
                    </div>
                  </div>

                  {activeRide.receiptHash && (
                    <div className="space-y-1 border-t border-white/10 pt-4">
                      <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Cpu className="h-3 w-3" />
                        <span className="uppercase tracking-wider font-bold">Settlement Execution</span>
                      </div>
                      
                      <div className="rounded bg-black/40 p-3 border border-white/5 space-y-2">
                         <div className="flex justify-between items-center">
                           <span className="text-slate-400 text-[10px]">REASON</span>
                           <span className="text-emerald-400 font-bold">{activeRide.settlementReason || 'RIDE_COMPLETED'}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-slate-400 text-[10px]">TX_ID</span>
                           <a href={`https://lora.algokit.io/testnet/transaction/${activeRide.settlementTxId}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate ml-4">
                             {activeRide.settlementTxId?.slice(0,16)}...
                           </a>
                         </div>
                      </div>

                      <div className="rounded bg-black/40 p-3 border border-emerald-500/20">
                        <div className="flex items-center gap-1.5 text-emerald-400/80 text-[10px] mb-1">
                          <Hash className="h-3 w-3" />
                          <span>WEB3_RECEIPT_HASH (SHA-256)</span>
                        </div>
                        <div className="break-all text-emerald-300 text-[10px] leading-relaxed">
                          {activeRide.receiptHash}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
