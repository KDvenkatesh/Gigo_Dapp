import { WalletProvider } from '@txnlab/use-wallet-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CarFront, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { CustomerDashboard } from './components/CustomerDashboard'
import { DriverDashboard } from './components/DriverDashboard'
import { MapView } from './components/MapView'
import { ToastStack } from './components/ToastStack'
import { WalletConnectButton } from './components/WalletConnectButton'
import { walletManager } from './config/wallet'
import { useRideContract } from './hooks/useRideContract'
import type { AppRole } from './types/ride'

function RoleCard({
  role,
  title,
  description,
  onSelect,
}: {
  role: AppRole
  title: string
  description: string
  onSelect: (role: AppRole) => void
}) {
  return (
    <motion.button
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(role)}
      className="group relative w-full overflow-hidden rounded-[40px] border border-white/10 bg-white/5 p-8 text-left shadow-[0_32px_80px_rgba(0,0,0,0.5)] transition-colors hover:bg-white/10"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative z-10">
        <div className="inline-flex rounded-[24px] bg-gradient-to-br from-emerald-300 via-emerald-400 to-cyan-400 p-4 text-slate-950 shadow-[0_0_32px_rgba(52,211,153,0.3)]">
          <CarFront className="h-7 w-7" />
        </div>
        <h3 className="mt-6 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">{description}</p>
        <div className="mt-8 flex items-center gap-2 text-sm font-bold text-emerald-300 transition-transform group-hover:translate-x-2">
          Enter dashboard <ArrowLeft className="h-4 w-4 rotate-180" />
        </div>
      </div>
    </motion.button>
  )
}

function RoleSelection({ onSelect }: { onSelect: (role: AppRole) => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 px-4 backdrop-blur-sm sm:px-6">
      <div className="w-full max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.32em] text-white/70"
        >
          <Sparkles className="h-4 w-4 text-emerald-400" />
          The Algorand GigGo dApp
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-6xl font-black tracking-[-0.05em] text-white sm:text-8xl lg:text-9xl"
        >
          GigGo.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg"
        >
          Experience a full contract-backed trip flow on Algorand. Connect your wallet, book a ride as a customer, or dispatch as a driver.
        </motion.p>
      </div>

      <div className="mt-12 grid w-full max-w-4xl gap-5 sm:mt-16 sm:grid-cols-2 md:gap-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <RoleCard
            role="customer"
            title="Customer Dashboard"
            description="Book rides, track live location, and lock payment in escrow via smart contract."
            onSelect={onSelect}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <RoleCard
            role="driver"
            title="Driver Dashboard"
            description="Accept rides, verify OTP, complete trips and release your payout from escrow."
            onSelect={onSelect}
          />
        </motion.div>
      </div>
    </div>
  )
}

function WalletGate({
  role,
  onBack,
}: {
  role: AppRole
  onBack: () => void
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 px-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl rounded-[40px] border border-white/10 bg-black/60 p-6 shadow-[0_40px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-10"
      >
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/50 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to roles
        </button>
        <div className="mt-8 sm:mt-10">
          <div className="inline-flex rounded-full bg-emerald-400/10 p-4 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Connect Pera wallet
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/60">
            {role === 'customer'
              ? 'Customer booking opens only after wallet connection so ride creation can be securely signed on-chain.'
              : 'Driver rides page opens only after wallet connection so you can accept rides and verify OTPs.'}
          </p>
          <div className="mt-8">
            <WalletConnectButton preferPera />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function RideApp() {
  const [role, setRole] = useState<AppRole | null>(null)
  const ride = useRideContract()

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-white">
      <MapView
        status={ride.focusedRide?.status ?? 'IDLE'}
        pickup={ride.focusedRide?.pickup.label ?? ''}
        drop={ride.focusedRide?.drop.label ?? ''}
        driverAssigned={Boolean(ride.focusedRide?.rider)}
      />



      <AnimatePresence mode="wait">
        {!role ? (
          <RoleSelection key="roles" onSelect={setRole} />
        ) : !ride.activeAddress ? (
          <WalletGate key="wallet-gate" role={role} onBack={() => setRole(null)} />
        ) : role === 'customer' ? (
          <CustomerDashboard key="customer" ride={ride} onBack={() => setRole(null)} />
        ) : (
          <DriverDashboard key="driver" ride={ride} onBack={() => setRole(null)} />
        )}
      </AnimatePresence>

      <ToastStack toasts={ride.toasts} onDismiss={ride.dismissToast} />
    </main>
  )
}

export default function App() {
  return (
    <WalletProvider manager={walletManager}>
      <RideApp />
    </WalletProvider>
  )
}
