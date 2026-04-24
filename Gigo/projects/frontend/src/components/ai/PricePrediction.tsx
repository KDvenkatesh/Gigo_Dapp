import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useX402 } from '../../hooks/useX402';
import { cn } from '../../lib/cn';

/* ── Types ── */
interface SurgeFarePrediction {
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
}

/* ── Helpers ── */
function percentChange(from: number, to: number): number {
  if (from === 0) return 0;
  return Math.round(((to - from) / from) * 100);
}

function formatALGO(amount: number): string {
  return `${amount.toFixed(3)} ALGO`;
}

/* ── Component ── */
export function PricePrediction({ pickup, destination, baseFare }: PricePredictionProps) {
  const { callX402API, isWalletReady } = useX402();
  const [prediction, setPrediction] = useState<SurgeFarePrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const fetchPrediction = useCallback(async () => {
    if (!pickup || !destination || !baseFare || !isWalletReady) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await callX402API<{ success: boolean; prediction: SurgeFarePrediction }>(
        '/api/predict-price',
        {
          pickup,
          destination,
          current_time: new Date().toISOString(),
          base_fare: baseFare,
        },
      );
      setPrediction(data.prediction);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Prediction failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [pickup, destination, baseFare, isWalletReady, callX402API]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      void fetchPrediction();
    }, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [fetchPrediction]);

  // Clear prediction when inputs change
  useEffect(() => {
    setPrediction(null);
  }, [pickup, destination, baseFare]);

  const pct10 = prediction ? percentChange(prediction.current_fare, prediction.fare_10min) : 0;
  const pct30 = prediction ? percentChange(prediction.current_fare, prediction.fare_30min) : 0;

  const recommendationConfig = {
    BOOK_NOW: {
      label: '✅ BOOK NOW',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    },
    WAIT: {
      label: '⏳ WAIT',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    },
    NEUTRAL: {
      label: '➖ NEUTRAL',
      bg: 'bg-white/5',
      border: 'border-white/10',
      text: 'text-white/60',
      glow: '',
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">AI Fare Prediction</span>
        </div>
        <button
          type="button"
          onClick={() => void fetchPrediction()}
          disabled={isLoading || !isWalletReady}
          className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/50 transition hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-40"
        >
          <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
          {prediction ? 'Refresh' : 'Analyze'}
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          {/* Loading state */}
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-6"
            >
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                <div className="absolute inset-0 animate-ping rounded-full bg-violet-400/20" />
              </div>
              <p className="text-sm text-white/40">AI analyzing fare trends…</p>
            </motion.div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-lg bg-rose-500/[0.06] p-3"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-rose-300">Could not predict</p>
                <p className="mt-0.5 truncate text-xs text-white/30">
                  Showing base fare • {error}
                </p>
              </div>
            </motion.div>
          )}

          {/* Idle state — no prediction yet */}
          {!isLoading && !error && !prediction && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-4 text-center"
            >
              <Bot className="h-6 w-6 text-white/20" />
              <p className="text-xs text-white/30">
                Tap <strong className="text-white/50">Analyze</strong> to get AI surge prediction
              </p>
            </motion.div>
          )}

          {/* Prediction results */}
          {!isLoading && prediction && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Fare rows */}
              <div className="grid gap-2">
                <FareRow
                  label="Current"
                  value={formatALGO(prediction.current_fare)}
                />
                <FareRow
                  label="In 10min"
                  value={formatALGO(prediction.fare_10min)}
                  change={pct10}
                />
                <FareRow
                  label="In 30min"
                  value={formatALGO(prediction.fare_30min)}
                  change={pct30}
                />
              </div>

              {/* Recommendation badge */}
              {(() => {
                const cfg = recommendationConfig[prediction.recommendation];
                return (
                  <div
                    className={cn(
                      'rounded-lg border p-3',
                      cfg.bg,
                      cfg.border,
                      cfg.glow,
                    )}
                  >
                    <p className={cn('text-sm font-semibold', cfg.text)}>
                      {cfg.label} — {prediction.reason}
                    </p>
                  </div>
                );
              })()}

              {/* Confidence bar */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                  Confidence
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-white/[0.06] h-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${prediction.confidence}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                  />
                </div>
                <span className="text-xs font-medium text-white/50">
                  {prediction.confidence}%
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Sub-component: Fare Row ── */
function FareRow({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
      <span className="text-xs font-medium text-white/40">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{value}</span>
        {change !== undefined && change !== 0 && (
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
              change > 0
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-emerald-500/10 text-emerald-400',
            )}
          >
            {change > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {change > 0 ? '+' : ''}
            {change}%
          </span>
        )}
        {change === 0 && (
          <span className="flex items-center gap-0.5 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold text-white/30">
            <Minus className="h-3 w-3" />
            0%
          </span>
        )}
      </div>
    </div>
  );
}
