import { motion } from 'framer-motion'
import type { PropsWithChildren } from 'react'

export function BottomSheet({ children }: PropsWithChildren) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 170, damping: 24 }}
      className="absolute inset-0 z-30 overflow-y-auto bg-[linear-gradient(180deg,rgba(12,15,20,0.97),#06080b)] px-4 pb-8 pt-4 shadow-[0_-24px_80px_rgba(0,0,0,0.5)] backdrop-blur-3xl sm:px-6 sm:pt-6"
    >
      {children}
    </motion.section>
  )
}
