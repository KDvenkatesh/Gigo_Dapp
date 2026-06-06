import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { ToastMessage } from '../types/ride'

interface ToastStackProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

const icons = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
} as const

const tones = {
  info: 'border-sky-500/30 bg-slate-900/95',
  success: 'border-emerald-500/30 bg-slate-900/95',
  error: 'border-rose-500/30 bg-slate-900/95',
} as const

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 z-50 mx-auto flex w-full max-w-md flex-col gap-3 px-4 sm:right-6 sm:left-auto sm:mx-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.tone]

          return (
            <motion.button
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              type="button"
              onClick={() => onDismiss(toast.id)}
              className={`pointer-events-auto rounded-[24px] border px-4 py-3 text-left shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl ${tones[toast.tone]}`}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-black/20 p-2">
                  <Icon className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{toast.title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/68">{toast.description}</p>
                </div>
              </div>
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
