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
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 px-4 backdrop-blur-xl animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden glass-container glass-container--rounded glass-container--large shadow-[0_32px_80px_rgba(0,0,0,0.5)]"
      >
        <div className="glass-filter" style={{ backdropFilter: 'blur(24px) saturate(130%)' }}></div>
        <div className="glass-overlay"></div>
        <div className="glass-specular"></div>
        <div className="glass-content p-2">
        <div className="flex flex-col items-center">
          {/* Logo Area */}
          <div className="relative w-full bg-gradient-to-b from-white/[0.03] to-transparent py-8 px-4 flex items-center justify-center border-b border-white/5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="absolute left-4 top-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/35 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <motion.img 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={logo} 
              alt="Gigo Logo" 
              className="h-52 w-auto object-contain" 
            />
          </div>

          {/* Connection Area */}
          <div className="w-full px-6 py-7 text-center">
            <h2 className="text-title-2 font-extrabold tracking-[-0.03em] text-white">
              Connect Pera Wallet
            </h2>
            <p className="text-xs text-white/50 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
              Experience decentralized Boda Boda ride-sharing. Connect your wallet to access the {role === 'customer' ? 'customer dashboard' : role === 'driver' ? 'rider portal' : 'admin console'}.
            </p>
            <div className="mt-6 flex justify-center">
              <WalletConnectButton preferPera />
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {role === 'customer' ? 'Customer Access' : role === 'driver' ? 'Driver Portal' : 'Admin Portal'}
            </div>
          </div>
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

import { useTheme } from './hooks/useTheme'

function RideApp() {
  const [role, setRole] = useState<AppRole>('customer')
  const ride = useRideContract()
  useTheme()

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

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setRole('driver')}
            className="group transition-all hover:scale-[1.03] shadow-[0_8px_30px_rgb(0,0,0,0.3)] glass-container glass-container--rounded"
          >
            <div className="glass-filter" style={{ borderRadius: '9999px' }}></div>
            <div className="glass-overlay" style={{ borderRadius: '9999px' }}></div>
            <div className="glass-specular" style={{ borderRadius: '9999px' }}></div>
            <div className="glass-content px-5 py-3 flex items-center gap-2.5 text-footnote font-bold tracking-tight text-white">
              <ShieldCheck className="h-4 w-4" />
              Become a Rider
            </div>
          </motion.button>
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setRole('admin')}
            className="text-caption-2 font-bold uppercase tracking-[0.12em] text-white/40 hover:text-emerald-400 transition-colors"
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
