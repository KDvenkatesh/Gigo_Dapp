import { motion } from 'framer-motion'
import { BadgeCheck, Calendar, Check, Crown, Gem, Shield } from 'lucide-react'
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

const tierMeta: Record<PassTier, { icon: typeof Shield; accent: string; label: string }> = {
  silver: { icon: Shield, accent: 'text-slate-400', label: 'Starter' },
  gold: { icon: Crown, accent: 'text-amber-400', label: 'Pro' },
  platinum: { icon: Gem, accent: 'text-violet-400', label: 'Elite' },
}

interface NFTPassCardProps {
  pass: PassInfo
  isWalletConnected: boolean
  onBuyPass?: () => void
}

export function NFTPassCard({ pass, isWalletConnected, onBuyPass }: NFTPassCardProps) {
  const meta = tierMeta[pass.tier]
  const TierIcon = meta.icon
  const isActive = pass.owned && pass.isActive

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'group relative flex h-full flex-col glass-container glass-container--rounded transition-all duration-300',
        isActive
          ? 'border-white/12 shadow-[0_8px_24px_rgba(255,255,255,0.04)]'
          : 'border-white/6 opacity-85 hover:opacity-100'
      )}
    >
      <div className="glass-filter"></div>
      <div className="glass-overlay"></div>
      <div className="glass-specular"></div>
      <div className="glass-content flex flex-col h-full">
        {/* ── Image Header ── */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#05060a]">
          <img
            src={passImages[pass.tier]}
            alt={pass.name}
            className={cn(
              'h-full w-full object-cover transition-transform duration-700 group-hover:scale-105',
              !isActive && 'opacity-60 saturate-50',
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05060a] via-transparent to-transparent opacity-80" />
          
          {/* Discount Badge */}
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md border border-white/10">
            <span className="text-[11px] font-bold text-white">{pass.discount}% OFF</span>
          </div>

          {/* Days remaining pill */}
          {isActive && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 backdrop-blur-md border border-white/10">
              <Calendar className="h-3 w-3 text-emerald-400" />
              <span className="text-[11px] font-medium text-white/90">
                {pass.daysRemaining} days left
              </span>
            </div>
          )}
        </div>

        {/* ── Content Body ── */}
        <div className="flex flex-1 flex-col p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TierIcon className={cn("h-4 w-4", meta.accent)} />
                <h3 className="text-[15px] font-bold text-white">{pass.name}</h3>
              </div>
              <p className="mt-1 text-xs font-medium text-white/40">{meta.label} Tier · {pass.validity}</p>
            </div>

            {/* Status Badge */}
            <div className="shrink-0">
              {isActive ? (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Active</span>
                </div>
              ) : pass.owned ? (
                <div className="rounded-full bg-rose-500/10 px-2.5 py-1 border border-rose-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Expired</span>
                </div>
              ) : (
                <div className="rounded-full bg-white/[0.06] px-2.5 py-1 border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Not Owned</span>
                </div>
              )}
            </div>
          </div>

          {/* Benefits List */}
          <div className="mt-6 flex-1 space-y-3">
            {pass.benefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/5">
                  <Check className={cn('h-2.5 w-2.5', isActive ? 'text-white' : 'text-white/30')} />
                </div>
                <span className={cn('text-[13px] leading-tight', isActive ? 'text-white/80' : 'text-white/40')}>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Action CTA */}
          <div className="mt-6 pt-4 border-t border-white/[0.04]">
            {isActive ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.08] py-2.5 text-sm font-medium text-white/60">
                <BadgeCheck className="h-4 w-4 text-emerald-400" />
                Discounts auto-applied
              </div>
            ) : pass.owned ? (
              <button
                type="button"
                onClick={onBuyPass}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-[#05060a] transition hover:bg-white/90"
              >
                Renew Pass
              </button>
            ) : (
              <button
                type="button"
                onClick={onBuyPass}
                disabled={!isWalletConnected}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-[#05060a] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Get {meta.label} Pass
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
