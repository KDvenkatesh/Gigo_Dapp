import { WalletProvider } from '@txnlab/use-wallet-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { CustomerDashboard } from './components/CustomerDashboard'
import { DriverDashboard } from './components/DriverDashboard'
import { DriverOnboarding } from './components/DriverOnboarding'
import { AdminDashboard } from './components/AdminDashboard'
import { MapView } from './components/MapView'
import { ToastStack } from './components/ToastStack'
import { WalletConnectButton } from './components/WalletConnectButton'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { ThemeToggle } from './components/ThemeToggle'
import { walletManager } from './config/wallet'
import { useRideContract } from './hooks/useRideContract'
import { CustomerProvider } from './contexts/CustomerContext'
import { DriverProvider, useDriverContext } from './contexts/DriverContext'
import { AdminProvider } from './contexts/AdminContext'
import type { AppRole } from './types/ride'

function WalletGate({
  role,
  onBack,
}: {
  role: AppRole
  onBack?: () => void
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 px-4 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl rounded-[40px] border border-white/10 bg-black/60 p-6 shadow-[0_40px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-10"
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/50 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
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
              : role === 'driver'
              ? 'Rider features require wallet connection to manage your profile and accept rides.'
              : 'Admin access is restricted to authorized wallets.'}
          </p>
          <div className="mt-8">
            <WalletConnectButton preferPera />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function DriverFlow({ onBack }: { onBack: () => void }) {
  const { status, ride } = useDriverContext();
  
  if (!ride.activeAddress) {
     return <WalletGate role="driver" onBack={onBack} />
  }

  if (status === 'approved') {
    return <DriverDashboard ride={ride} onBack={onBack} />
  }

  return <DriverOnboarding onBack={onBack} />
}

function RideApp() {
  const [role, setRole] = useState<AppRole>('customer')
  const ride = useRideContract()

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-white">
      <MapView
        status={ride.focusedRide?.status ?? 'IDLE'}
        pickup={ride.focusedRide?.pickup.label ?? ''}
        drop={ride.focusedRide?.drop.label ?? ''}
        driverAssigned={Boolean(ride.focusedRide?.rider)}
      />

      {role === 'customer' && !ride.activeAddress && (
        <div className="absolute top-6 right-6 z-[60] flex flex-col items-end gap-3">
          <ThemeToggle />
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setRole('driver')}
            className="group flex items-center gap-2.5 rounded-full border border-white/20 bg-black/60 px-6 py-3 text-[13px] font-bold tracking-tight text-white transition-all hover:bg-white hover:text-black hover:border-white shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-xl"
          >
            <ShieldCheck className="h-4 w-4" />
            Become a Rider
          </motion.button>
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setRole('admin')}
            className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/40 hover:text-emerald-400 transition-colors"
          >
            Admin Login
          </motion.button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {role === 'customer' ? (
          <CustomerProvider key="customer">
            {!ride.activeAddress ? (
              <WalletGate key="wallet-gate-customer" role={role} />
            ) : (
              <CustomerDashboard key="customer-dash" ride={ride} onBack={() => {}} onSwitchRole={setRole} />
            )}
          </CustomerProvider>
        ) : role === 'driver' ? (
          <DriverProvider key="driver">
            <DriverFlow onBack={() => setRole('customer')} />
          </DriverProvider>
        ) : (
          <AdminProvider key="admin">
             <AdminDashboard onBack={() => setRole('customer')} />
          </AdminProvider>
        )}
      </AnimatePresence>

      <ToastStack toasts={ride.toasts} onDismiss={ride.dismissToast} />
      <PWAInstallPrompt isMainPage={!ride.activeAddress && role === 'customer'} />
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
