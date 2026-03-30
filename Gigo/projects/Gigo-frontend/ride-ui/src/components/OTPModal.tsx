import { AnimatePresence, motion } from 'framer-motion'
import { LoaderCircle, ShieldEllipsis, X } from 'lucide-react'

interface OTPModalProps {
  isOpen: boolean
  isLoading: boolean
  otp: string
  expectedOtp: string
  onOtpChange: (value: string) => void
  onClose: () => void
  onVerify: () => void
}

export function OTPModal({
  isOpen,
  isLoading,
  otp,
  expectedOtp,
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
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 px-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            className="w-full max-w-sm rounded-[32px] border border-white/10 bg-[var(--panel-strong)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.48)]"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
                <ShieldEllipsis className="h-6 w-6 text-emerald-300" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/65 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h2 className="text-2xl font-bold tracking-[-0.03em] text-white">Verify trip start</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Enter the 4-digit rider OTP before the driver can start the trip.
            </p>

            <div className="mt-5 rounded-[28px] border border-white/8 bg-white/5 p-4">
              <input
                value={otp}
                onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                inputMode="numeric"
                placeholder="0000"
                className="w-full bg-transparent text-center text-4xl font-semibold tracking-[0.45em] text-white outline-none"
              />
              <p className="mt-3 text-center text-xs text-white/38">Demo code: {expectedOtp}</p>
            </div>

            <button
              type="button"
              disabled={isLoading || otp.length !== 4}
              onClick={onVerify}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-400 px-4 py-4 text-base font-bold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
              {isLoading ? 'Verifying OTP' : 'Start ride'}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
