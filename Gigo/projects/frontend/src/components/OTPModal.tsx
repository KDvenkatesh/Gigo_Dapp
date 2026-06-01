import { AnimatePresence, motion } from 'framer-motion'
import { LoaderCircle, ShieldEllipsis, X } from 'lucide-react'

interface OTPModalProps {
  isOpen: boolean
  isLoading: boolean
  otp: string
  error?: string
  onOtpChange: (value: string) => void
  onClose: () => void
  onVerify: () => void
}

export function OTPModal({
  isOpen,
  isLoading,
  otp,
  error,
  onOtpChange,
  onClose,
  onVerify,
}: OTPModalProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 px-4 backdrop-blur-xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            className="w-full max-w-sm glass-container glass-container--rounded glass-container--large shadow-[0_24px_80px_rgba(0,0,0,0.48)]"
          >
            <div className="glass-filter" style={{ backdropFilter: 'blur(24px) saturate(130%)' }}></div>
            <div className="glass-overlay"></div>
            <div className="glass-specular"></div>
            <div className="glass-content p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
                <ShieldEllipsis className="h-6 w-6 text-emerald-300" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="glass-container glass-container--rounded text-white/65 transition hover:text-white"
                style={{ borderRadius: '9999px' }}
              >
                <div className="glass-filter" style={{ borderRadius: '9999px' }}></div>
                <div className="glass-overlay" style={{ borderRadius: '9999px' }}></div>
                <div className="glass-specular" style={{ borderRadius: '9999px' }}></div>
                <div className="glass-content p-2 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </div>
              </button>
            </div>

            <h2 className="text-title-2 font-bold tracking-[-0.03em] text-white">Verify trip start</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Enter the 4-digit rider OTP before the driver can start the trip.
            </p>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/40 p-4">
              <input
                value={otp}
                onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                inputMode="numeric"
                placeholder="0000"
                className="w-full bg-transparent text-center text-4xl font-semibold tracking-[0.45em] text-white outline-none"
              />
            </div>

            {error && (
              <p className="mt-3 text-center text-sm font-medium text-red-400">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={isLoading || otp.length !== 4}
              onClick={onVerify}
              className="mt-5 w-full clay-btn clay-btn-brand py-3.5 flex items-center justify-center gap-2 text-base font-black disabled:opacity-40"
            >
              {isLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
              {isLoading ? 'Verifying OTP...' : 'Start Ride'}
            </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
