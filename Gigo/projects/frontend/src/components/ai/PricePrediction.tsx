import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useX402 } from '../../hooks/useX402';
import { cn } from '../../lib/cn';

/* ── Types ── */
interface SurgeFarePrediction {
  current_time_analysis: string;
  traffic_details: string;
  current_fare: number;
  fare_10min: number;
  fare_30min: number;
  surge_multiplier: number;
  recommendation: 'BOOK_NOW' | 'WAIT' | 'NEUTRAL';
  reason: string;
  confidence: number;
}

interface PricePredictionProps {
  pickup: string;
  destination: string;
  baseFare: number;
  flat?: boolean;
}

/* ── Helpers ── */
function percentChange(from: number, to: number): number {
  if (from === 0) return 0;
  return Math.round(((to - from) / from) * 100);
}
function formatALGO(n: number) { return `${n.toFixed(3)} ALGO`; }

/** Format an ISO timestamp to "2:30 PM" */
function formatISOTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/* ── Phase steps shown during loading ── */
type Phase = 'idle' | 'step1' | 'step2' | 'step3' | 'done';
const STEPS = [
  { id: 'step1', icon: '🕒', label: 'Grok analyzing current time…' },
  { id: 'step2', icon: '🚦', label: 'Estimating traffic conditions…' },
  { id: 'step3', icon: '📈', label: 'Predicting future ride prices…' },
] as const;

/* ── Component ── */
export function PricePrediction({ pickup, destination, baseFare, flat = false }: PricePredictionProps) {
  const { callX402API, isWalletReady } = useX402();
  const [prediction, setPrediction] = useState<SurgeFarePrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [capturedTime, setCapturedTime] = useState(''); // the ISO time sent to Grok

  const fetchPrediction = useCallback(async () => {
    if (!pickup || !destination || !baseFare || !isWalletReady) return;

    // ── Capture CURRENT time right at the moment of click ──
    const nowISO = new Date().toISOString();
    setCapturedTime(nowISO);

    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      // Phase 1 — time (visual, 600ms)
      setPhase('step1');
      await new Promise(r => setTimeout(r, 600));

      // Phase 2 — traffic (visual, 600ms)
      setPhase('step2');
      await new Promise(r => setTimeout(r, 600));

      // Phase 3 — actual Grok call with the captured now time
      setPhase('step3');

      const localTimeStr = new Date().toLocaleString('en-US', { 
          weekday: 'long', 
          hour: 'numeric', 
          minute: 'numeric', 
          hour12: true 
      });

      const data = await callX402API<{ success: boolean; prediction: SurgeFarePrediction }>(
        '/api/predict-price',
        {
          pickup,
          destination,
          current_time: `${localTimeStr} (IST)`,   // Explicitly tell Grok the local time
          base_fare: baseFare,
        },
      );

      setPhase('done');
      setPrediction(data.prediction);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
      setPhase('idle');
    } finally {
      setIsLoading(false);
    }
  }, [pickup, destination, baseFare, isWalletReady, callX402API]);

  const pct10 = prediction ? percentChange(prediction.current_fare, prediction.fare_10min) : 0;
  const pct30 = prediction ? percentChange(prediction.current_fare, prediction.fare_30min) : 0;

  const REC = {
    BOOK_NOW: { label: '✅ BOOK NOW', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-600 dark:text-emerald-400' },
    WAIT:     { label: '⏳ WAIT',     bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   text: 'text-amber-600 dark:text-amber-400'   },
    NEUTRAL:  { label: '➖ NEUTRAL',  bg: 'bg-black/5',        border: 'border-black/10',       text: 'text-current opacity-60'    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "overflow-hidden flex flex-col justify-between h-full",
        flat ? "" : "rounded-xl border border-white/[0.08] bg-white/[0.02]"
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-current/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-current">AI Fare Prediction</span>
            {capturedTime && !isLoading && prediction && (
              <p className="text-[10px] opacity-40 mt-0.5">
                Analyzed at {formatISOTime(capturedTime)}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={fetchPrediction}
          disabled={isLoading || !isWalletReady || !pickup || !destination}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600/10 px-3 py-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300 transition hover:bg-violet-600/20 disabled:opacity-40 border border-violet-500/20 shadow-sm"
        >
          <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
          {prediction ? 'Re-analyze' : 'Analyze'}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="pt-4 flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">

          {/* IDLE */}
          {!isLoading && !prediction && !error && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-3 text-center">
              <Bot className="h-7 w-7 opacity-15" />
              <p className="text-sm font-bold opacity-50">
                Click <span className="text-violet-700 dark:text-violet-300 font-bold">Analyze</span> to get live prediction
              </p>
              <p className="text-[10px] opacity-30">
                Grok will use the exact current time when you click
              </p>
            </motion.div>
          )}

          {/* LOADING — animated steps */}
          {isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-2.5 py-1">
              <div className="flex items-center gap-3 mb-1">
                <Loader2 className="h-4 w-4 animate-spin text-violet-600 dark:text-violet-400 shrink-0" />
                <span className="text-xs font-bold opacity-50">
                  Analyzing for {capturedTime ? formatISOTime(capturedTime) : '…'}
                </span>
              </div>
              {STEPS.map((step, i) => {
                const stepId = `step${i + 1}` as Phase;
                const phaseOrder = ['step1', 'step2', 'step3'];
                const phaseIdx = phaseOrder.indexOf(phase as string);
                const isDone = phaseIdx > i;
                const isActive = phase === stepId;
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: isActive || isDone ? 1 : 0.3, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 border transition-all',
                      isDone   ? 'bg-emerald-500/5 border-emerald-500/15' :
                      isActive ? 'bg-violet-500/10 border-violet-500/20' :
                                 'bg-black/5 border-black/5'
                    )}
                  >
                    <span className="text-sm leading-none">{step.icon}</span>
                    <span className={cn('text-xs font-bold flex-1',
                      isDone ? 'text-emerald-600 dark:text-emerald-400' : isActive ? 'text-violet-700 dark:text-violet-300' : 'opacity-40')}>
                      {step.label}
                    </span>
                    {isDone   && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    {isActive && <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600 dark:text-violet-400 shrink-0" />}
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* ERROR */}
          {!isLoading && error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-lg bg-rose-500/[0.06] border border-rose-500/15 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Could not predict</p>
                <p className="mt-0.5 truncate text-xs opacity-40">{error}</p>
              </div>
            </motion.div>
          )}

          {/* RESULTS */}
          {!isLoading && prediction && (
            <motion.div key="result" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3">

              {/* ① Grok context: time + traffic — from Grok's own reply */}
              <div className="rounded-lg border border-current/10 bg-current/[0.03] p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  Grok Analysis · {formatISOTime(capturedTime)}
                </p>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-xs mt-0.5">🕒</span>
                  <p className="text-xs opacity-80 leading-relaxed">{prediction.current_time_analysis}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-xs mt-0.5">🚦</span>
                  <p className="text-xs opacity-80 leading-relaxed">{prediction.traffic_details}</p>
                </div>
              </div>

              {/* ② Price rows */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 px-1">Price Prediction</p>
                <FareRow label={`Now (${formatISOTime(capturedTime)})`} value={formatALGO(prediction.current_fare)} highlight />
                <FareRow label="In 10 min" value={formatALGO(prediction.fare_10min)} change={pct10} />
                <FareRow label="In 30 min" value={formatALGO(prediction.fare_30min)} change={pct30} />
              </div>

              {/* ③ Recommendation */}
              {(() => {
                const cfg = REC[prediction.recommendation];
                return (
                  <div className={cn('rounded-lg border p-3 shadow-sm', cfg.bg, cfg.border)}>
                    <p className={cn('text-xs font-bold', cfg.text)}>
                      {cfg.label} — {prediction.reason}
                    </p>
                  </div>
                );
              })()}

              {/* Confidence bar */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-45 shrink-0">Confidence</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-current/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${prediction.confidence}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                  />
                </div>
                <span className="text-xs font-bold opacity-60 shrink-0">{prediction.confidence}%</span>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Fare Row ── */
function FareRow({ label, value, change, highlight }: {
  label: string; value: string; change?: number; highlight?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between rounded-lg px-3 py-1.5',
      highlight ? 'bg-current/[0.07] border border-current/10' : 'bg-current/[0.03]'
    )}>
      <span className={cn('text-xs font-bold', highlight ? 'text-current' : 'opacity-50')}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn('text-xs font-black', highlight ? 'text-current' : 'opacity-85')}>{value}</span>
        {change !== undefined && change !== 0 && (
          <span className={cn('flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-sm',
            change > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400')}>
            {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
        {change === 0 && (
          <span className="flex items-center gap-0.5 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold opacity-30">
            <Minus className="h-3 w-3" />0%
          </span>
        )}
      </div>
    </div>
  );
}
