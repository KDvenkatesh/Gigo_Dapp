import { motion } from 'framer-motion'
import { BadgeCheck, Calendar, CarFront, Check, Crown, Gem, Shield, Sparkles } from 'lucide-react'
import type { PassInfo, PassTier } from '../hooks/useAlgorandAssets'
import { cn } from '../lib/cn'

import silverPassImg from '../assets/SilverPass.jpeg'
import goldPassImg from '../assets/goldPass.jpeg'
import platinumPassImg from '../assets/PlatinumPass.jpeg'

const passImages: Record<PassTier, string> = {
  silver: silverPassImg,
  gold: goldPassImg,
  platinum: platinumPassImg,
}

const tierMeta: Record<PassTier, { icon: typeof Shield; accent: string; label: string; gradient: string }> = {
  silver: { icon: Shield, accent: 'text-gray-400', label: 'Starter', gradient: 'from-gray-400 to-gray-500' },
  gold: { icon: Crown, accent: 'text-amber-400', label: 'Pro', gradient: 'from-amber-400 to-orange-500' },
  platinum: { icon: Gem, accent: 'text-violet-400', label: 'Elite', gradient: 'from-violet-400 to-indigo-500' },
}

interface NFTPassCardProps {
  pass: PassInfo
  isWalletConnected: boolean
  onUsePass?: () => void
  onBuyPass?: () => void
}

export function NFTPassCard({ pass, isWalletConnected, onUsePass, onBuyPass }: NFTPassCardProps) {
  const meta = tierMeta[pass.tier]
  const TierIcon = meta.icon
  const isActive = pass.owned && pass.isActive

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative flex flex-col"
    >
      <div
        className={cn(
          'relative flex flex-1 flex-col overflow-hidden rounded-2xl border transition-all duration-300',
          isActive
            ? 'border-white/[0.12] bg-white/[0.04]'
            : 'border-white/[0.06] bg-white/[0.02]',
          'hover:border-white/[0.18] hover:bg-white/[0.05]',
        )}
      >
        {/* ── Image ── */}
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <img
            src={passImages[pass.tier]}
            alt={pass.name}
            className={cn(
              'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]',
              !isActive && 'opacity-60 saturate-50',
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05060a] via-[#05060a]/40 to-transparent" />

          {/* Days remaining pill */}
          {isActive && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 backdrop-blur-md">
              <Calendar className="h-3 w-3 text-white/60" />
              <span className="text-[11px] font-medium text-white/80">
                {pass.daysRemaining}d left
              </span>
            </div>
          )}

          {/* Expired badge */}
          {pass.owned && !pass.isActive && (
            <div className="absolute bottom-3 left-3 rounded-lg bg-rose-500/20 px-2.5 py-1 backdrop-blur-md">
              <span className="text-[11px] font-semibold text-rose-300">Expired</span>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="flex flex-1 flex-col p-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white', meta.gradient)}>
                <TierIcon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">{pass.name}</h3>
                <p className={cn('text-xs', meta.accent)}>{meta.label} Plan</p>
              </div>
            </div>

            {/* Status */}
            {isActive ? (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-400">Active</span>
              </div>
            ) : pass.owned ? (
              <div className="rounded-full bg-rose-500/10 px-2.5 py-1">
                <span className="text-[11px] font-medium text-rose-400">Expired</span>
              </div>
            ) : (
              <div className="rounded-full bg-white/[0.06] px-2.5 py-1">
                <span className="text-[11px] font-medium text-white/35">Not Owned</span>
              </div>
            )}
          </div>

          {/* Free ride indicator — always rendered for consistent height */}
          <div className={cn(
            'mt-4 flex items-center gap-2 rounded-xl p-3',
            isActive && pass.freeRideToday
              ? 'bg-emerald-500/[0.07] border border-emerald-500/10'
              : isActive
                ? 'bg-white/[0.03] border border-white/[0.06]'
                : 'bg-white/[0.02] border border-white/[0.04]',
          )}>
            <CarFront className={cn('h-4 w-4', isActive && pass.freeRideToday ? 'text-emerald-400' : isActive ? 'text-white/30' : 'text-white/15')} />
            <span className={cn('text-xs font-medium', isActive && pass.freeRideToday ? 'text-emerald-300' : isActive ? 'text-white/40' : 'text-white/20')}>
              {isActive
                ? (pass.freeRideToday ? '1 free ride available today' : 'Free ride used today')
                : 'Opt-in to unlock free rides'}
            </span>
          </div>

          {/* Benefits */}
          <div className="mt-4 flex-1 space-y-2">
            {pass.benefits.slice(0, 3).map((benefit) => (
              <div key={benefit} className="flex items-center gap-2.5">
                <Check className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-emerald-400' : 'text-white/20')} />
                <span className={cn('text-[13px]', isActive ? 'text-white/70' : 'text-white/35')}>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Metadata */}
          <div className="mt-auto flex items-center gap-3 pt-4">
            <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-white/40">
              {pass.validity}
            </span>
            <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-white/40">
              {pass.discount}% off
            </span>
            {pass.priorityMatching && (
              <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-white/40">
                Priority
              </span>
            )}
          </div>

          {/* CTA */}
          <div className="mt-5">
            {isActive ? (
              <button
                type="button"
                onClick={onUsePass}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-[#05060a] transition hover:bg-white/90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                View Pass Details
              </button>
            ) : pass.owned ? (
              <button
                type="button"
                onClick={onBuyPass}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white"
              >
                Renew Pass
              </button>
            ) : (
              <button
                type="button"
                onClick={onBuyPass}
                disabled={!isWalletConnected}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Get Pass
              </button>
            )}
          </div>
        </div>

        {/* Verified badge */}
        {pass.owned && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 backdrop-blur-md">
            <BadgeCheck className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-300">Verified</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
