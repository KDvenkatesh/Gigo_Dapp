import { useWallet } from '@txnlab/use-wallet-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Gem, Loader2, RefreshCw, ShieldAlert, Sparkles, Wallet } from 'lucide-react'
import { useAlgorandAssets, type PassTier, type PassInfo } from '../hooks/useAlgorandAssets'
import { cn } from '../lib/cn'
import { NFTPassCard } from './NFTPassCard'
import { WalletConnectButton } from './WalletConnectButton'
import { PassPurchaseModal } from './PassPurchaseModal'
import { useState } from 'react'

// ── Stats Bar ──
function StatsBar({
  activeTier,
  hasPriority,
  hasZeroSurge,
}: {
  activeTier: PassTier | null
  hasPriority: boolean
  hasZeroSurge: boolean
}) {
  const stats = [
    {
      label: 'Active Tier',
      value: activeTier ? activeTier.charAt(0).toUpperCase() + activeTier.slice(1) : 'None',
      highlight: Boolean(activeTier),
    },
    {
      label: 'Priority Matching',
      value: hasPriority ? 'Enabled' : 'Disabled',
      highlight: hasPriority,
    },
    {
      label: 'Zero Surge',
      value: hasZeroSurge ? 'Active' : 'Inactive',
      highlight: hasZeroSurge,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            {stat.label}
          </p>
          <p
            className={cn(
              'mt-1.5 text-sm font-bold',
              stat.highlight ? 'text-emerald-400' : 'text-white/40',
            )}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  )
}

interface PassDashboardProps {
  ride: any
  onBack: () => void
}

export function PassDashboard({ ride, onBack }: PassDashboardProps) {
  const { activeAddress } = useWallet()
  const { passes, activeTier, isLoading, error, refetch, hasPriorityMatching, hasZeroSurge } =
    useAlgorandAssets()
  const [selectedPass, setSelectedPass] = useState<PassInfo | null>(null)

  return (
    <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-[#05060a]">
      {/* ── Top Navigation ── */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#05060a]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-white/60 transition hover:bg-white/[0.06]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <Gem className="h-4 w-4 text-violet-400" />
          <h1 className="text-sm font-bold text-white sm:text-base">Ride Pass</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refetch}
            disabled={isLoading || !activeAddress}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-white/60 transition hover:bg-white/[0.06] disabled:opacity-40"
            title="Refresh passes"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          <WalletConnectButton />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/60">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              NFT Ride Passes
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Your Pass Collection
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/50 sm:text-base">
              Unlock automatic ride discounts with NFT passes on Algorand. Connect your wallet to verify ownership and activate benefits passively on every ride.
            </p>
          </motion.div>

          {/* Wallet not connected */}
          {!activeAddress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-10 rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-10 text-center"
            >
              <div className="inline-flex rounded-full bg-white/5 p-4 text-white/30">
                <Wallet className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">Connect Your Wallet</h3>
              <p className="mt-2 text-sm text-white/40">
                Link your Pera wallet to verify NFT pass ownership on Algorand testnet.
              </p>
              <div className="mt-6 inline-block">
                <WalletConnectButton preferPera />
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {activeAddress && isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-10 flex flex-col items-center gap-4 py-20"
            >
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
              <p className="text-sm text-white/40">Verifying NFT passes on-chain…</p>
            </motion.div>
          )}

          {/* Error */}
          {activeAddress && error && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-xl border border-rose-500/20 bg-rose-500/[0.05] p-4"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-rose-400" />
                <div>
                  <p className="text-sm font-bold text-rose-300">Verification Error</p>
                  <p className="mt-0.5 text-xs text-rose-300/60">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={refetch}
                className="mt-3 rounded-lg bg-rose-500/10 px-4 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
              >
                Retry
              </button>
            </motion.div>
          )}

          {/* Stats bar */}
          {activeAddress && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-8"
            >
              <StatsBar
                activeTier={activeTier}
                hasPriority={hasPriorityMatching}
                hasZeroSurge={hasZeroSurge}
              />
            </motion.div>
          )}

          {/* Pass Cards Grid */}
          {activeAddress && !isLoading && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {passes.map((pass, index) => (
                <motion.div
                  key={pass.tier}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <NFTPassCard
                    pass={pass}
                    isWalletConnected={Boolean(activeAddress)}
                    onBuyPass={() => setSelectedPass(pass)}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* How it works */}
          {activeAddress && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-12 rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8"
            >
              <h3 className="text-lg font-bold text-white">How NFT Passes Work</h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    step: '01',
                    title: 'Acquire Pass',
                    desc: 'Opt-in to the specific Gigo pass NFT (ASA) on your wallet.',
                  },
                  {
                    step: '02',
                    title: 'Pay GIGC',
                    desc: 'Purchase the pass directly using GIGC tokens.',
                  },
                  {
                    step: '03',
                    title: 'Enjoy Benefits',
                    desc: 'Discounts apply automatically. Higher tiers unlock priority matching & zero surge.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-white/50">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/40">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
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
    </div>
  )
}
