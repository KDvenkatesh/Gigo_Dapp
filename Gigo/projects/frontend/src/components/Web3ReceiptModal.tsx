import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, Link as LinkIcon, Calendar, CheckCircle2 } from 'lucide-react'

export function Web3ReceiptModal({ ride, onClose }: { ride: any, onClose: () => void }) {
  if (!ride) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c10] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Immutable Web3 Receipt</h3>
                <p className="text-xs text-white/50">Cryptographic Proof of Settlement</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/5 p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Settlement Reason</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm font-medium text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {ride.settlementReason || ride.cancellationReason || (ride.status === 'CANCELLED' ? 'CANCELLED' : 'RIDE_COMPLETED')}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Settlement Fare</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm font-bold text-sky-400">
                {ride.fareMicroAlgos ? (Number(ride.fareMicroAlgos) / 1000000).toFixed(3) : '0.000'} GIGC
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Receipt Hash (SHA-256)</label>
              <div className="rounded-xl border border-white/5 bg-black/40 p-3">
                <code className="break-all text-xs text-white/70">
                  {ride.receiptHash || 'Not available'}
                </code>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Algorand Transaction ID</label>
              <div className="rounded-xl border border-white/5 bg-black/40 p-3">
                <code className="break-all text-xs text-sky-400">
                  {ride.settlementTxId || 'Not available'}
                </code>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Settlement Timestamp</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-white/70">
                <Calendar className="h-4 w-4 text-white/40" />
                {ride.updatedAt ? new Date(ride.updatedAt).toLocaleString() : 'Not available'}
              </div>
            </div>

            {ride.presenceEvidence && ride.presenceEvidence.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Customer Presence Evidence</label>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-white/70">
                  <ul className="list-disc pl-4 space-y-1">
                    {ride.presenceEvidence.map((ev: string) => (
                      <li key={ev} className="font-mono text-[10px] text-amber-200/80">{ev}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Raw Receipt JSON</label>
              <div className="rounded-xl border border-white/5 bg-[#05060a] p-4 font-mono text-[10px] leading-relaxed text-white/50">
                <pre className="whitespace-pre-wrap">
{JSON.stringify({
  rideId: ride.rideId?.toString(),
  customer: ride.customer,
  driver: ride.rider,
  fare: ride.fareMicroAlgos?.toString(),
  settlementReason: ride.settlementReason || ride.cancellationReason || (ride.status === 'CANCELLED' ? 'CANCELLED' : 'RIDE_COMPLETED'),
  settlementTxId: ride.settlementTxId,
  receiptHash: ride.receiptHash,
  customerPresent: ride.presenceEvidence ? ride.presenceEvidence.length > 0 : false,
  presenceEvidence: ride.presenceEvidence || []
}, null, 2)}
                </pre>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="border-t border-white/10 bg-white/[0.02] p-5">
            <a
              href={`https://lora.algokit.io/testnet/transaction/${ride.settlementTxId || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500/10 py-3 text-sm font-bold text-sky-400 transition hover:bg-sky-500/20"
            >
              <LinkIcon className="h-4 w-4" />
              View Settlement Transaction
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
