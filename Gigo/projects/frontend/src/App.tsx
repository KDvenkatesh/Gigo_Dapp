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

import logo from './assets/Gigo_Dapp.png'

function WalletGate({
  role,
  onBack,
}: {
  role: AppRole
  onBack?: () => void
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 px-4 backdrop-blur-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg overflow-hidden rounded-[40px] border border-white/10 bg-black/40 shadow-[0_40px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
      >
        <div className="flex flex-col items-center">
          {/* 80% Image Area */}
          <div className="relative w-full bg-white/[0.01] py-6 flex items-center justify-center border-b border-white/5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="absolute left-6 top-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/30 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={logo} 
              alt="Gigo Logo" 
              className="h-96 w-auto object-contain" 
            />
          </div>

          {/* 20% Connection Area */}
          <div className="w-full px-6 py-8 text-center">
            <h2 className="text-xl font-black tracking-tight text-white">
              Connect Pera Wallet
            </h2>
            <div className="mt-6 flex justify-center">
              <WalletConnectButton preferPera />
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-widest font-bold text-white/20">
              {role === 'customer' ? 'Customer Access' : role === 'driver' ? 'Rider Portal' : 'Admin Portal'}
            </p>
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
              <CustomerDashboard key="customer-dash" ride={ride} onBack={() => { }} onSwitchRole={setRole} />
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
