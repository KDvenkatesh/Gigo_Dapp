import { useWallet } from '@txnlab/use-wallet-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Gem, Loader2, RefreshCw, ShieldAlert, Sparkles, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useAlgorandAssets, type PassTier } from '../hooks/useAlgorandAssets'
import { cn } from '../lib/cn'
import { NFTPassCard } from './NFTPassCard'
import { WalletConnectButton } from './WalletConnectButton'

// ── Animated Background Mesh ──
function BackgroundMesh() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Gradient orbs */}
      <motion.div
        className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)',
        }}
        animate={{ x: [0, -20, 0], y: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(52,211,153,0.05) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  )
}

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
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            {stat.label}
          </p>
          <p
            className={cn(
              'mt-1.5 text-sm font-black',
              stat.highlight ? 'text-emerald-300' : 'text-white/40',
            )}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Use Pass Modal ──
function UsePassModal({
  tier,
  discount,
  onClose,
}: {
  tier: PassTier
  discount: number
  onClose: () => void
}) {
  const tierNames: Record<PassTier, string> = {
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0c12]/95 p-8 shadow-[0_40px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
      >
        <div className="flex items-center justify-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/20"
          >
            <Sparkles className="h-10 w-10 text-emerald-400" />
          </motion.div>
        </div>
        <h3 className="mt-6 text-center text-2xl font-black text-white">
          {tierNames[tier]} Pass Active
        </h3>
        <p className="mt-3 text-center text-sm leading-relaxed text-white/50">
          Your {discount}% ride discount is automatically applied when you book your next ride.
          {tier === 'gold' && ' Priority driver matching is enabled.'}
          {tier === 'platinum' && ' Priority matching + zero surge pricing are both active.'}
        </p>
        <div className="mt-6 rounded-2xl border border-emerald-300/10 bg-emerald-400/5 p-4">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300">Benefits applied to all future rides</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-white py-3 text-sm font-black text-slate-950 transition hover:bg-white/90"
        >
          Got it
        </button>
      </motion.div>
    </motion.div>
  )
}

interface PassDashboardProps {
  onBack: () => void
}

export function PassDashboard({ onBack }: PassDashboardProps) {
  const { activeAddress } = useWallet()
  const { passes, activeTier, isLoading, error, refetch, hasPriorityMatching, hasZeroSurge } =
    useAlgorandAssets()
  const [usePassModal, setUsePassModal] = useState<{ tier: PassTier; discount: number } | null>(null)

  return (
    <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-[#06080b]">
      <BackgroundMesh />

      {/* ── Top Navigation ── */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-black/60 px-4 py-3 backdrop-blur-xl sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 bg-white/6 p-2 text-white/72 transition hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <Gem className="h-4 w-4 text-violet-400" />
          <h1 className="text-sm font-black tracking-tight text-white sm:text-base">Ride Pass</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refetch}
            disabled={isLoading || !activeAddress}
            className="rounded-full border border-white/10 bg-white/6 p-2 text-white/72 transition hover:bg-white/10 disabled:opacity-40"
            title="Refresh passes"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          <WalletConnectButton />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-white/60">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              NFT-Powered Ride Passes
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              Your Ride Pass{' '}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                Collection
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/45 sm:text-base">
              Unlock exclusive ride discounts with NFT passes on Algorand. Connect your wallet to
              verify ownership and activate benefits.
            </p>
          </motion.div>

          {/* Wallet not connected */}
          {!activeAddress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-10 rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] p-10 text-center"
            >
              <div className="inline-flex rounded-full bg-white/5 p-4 text-white/30">
                <Wallet className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white/60">Connect Your Wallet</h3>
              <p className="mt-2 text-sm text-white/35">
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
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
              <p className="text-sm text-white/40">Verifying NFT passes on-chain…</p>
            </motion.div>
          )}

          {/* Error */}
          {activeAddress && error && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-[20px] border border-rose-400/20 bg-rose-400/5 p-4"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-rose-400" />
                <div>
                  <p className="text-sm font-bold text-rose-300">Verification Error</p>
                  <p className="mt-0.5 text-xs text-white/50">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={refetch}
                className="mt-3 rounded-xl bg-rose-400/10 px-4 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-400/20"
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
                    onUsePass={() =>
                      setUsePassModal({ tier: pass.tier, discount: pass.discount })
                    }
                    onBuyPass={() => {
                      // Open Algorand explorer for the asset
                      window.open(
                        `https://testnet.explorer.perawallet.app/asset/${pass.assetId}/`,
                        '_blank',
                      )
                    }}
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
              className="mt-12 rounded-[28px] border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8"
            >
              <h3 className="text-lg font-black text-white">How NFT Passes Work</h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    step: '01',
                    title: 'Acquire Pass',
                    desc: 'Get an NFT ride pass on the Algorand blockchain as an ASA token.',
                  },
                  {
                    step: '02',
                    title: 'Connect & Verify',
                    desc: 'Connect your Pera wallet. We verify pass ownership via the Indexer API.',
                  },
                  {
                    step: '03',
                    title: 'Enjoy Benefits',
                    desc: 'Discounts apply automatically. Higher tiers unlock priority matching & zero surge.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-black text-violet-400">
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

      {/* Use Pass Modal */}
      <AnimatePresence>
        {usePassModal && (
          <UsePassModal
            tier={usePassModal.tier}
            discount={usePassModal.discount}
            onClose={() => setUsePassModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
