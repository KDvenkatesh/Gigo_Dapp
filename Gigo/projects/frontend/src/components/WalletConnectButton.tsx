import { useWallet } from '@txnlab/use-wallet-react'
import { motion } from 'framer-motion'
import { Wallet, X } from 'lucide-react'

export function WalletConnectButton({ preferPera = false }: { preferPera?: boolean }) {
  const { wallets, activeAddress, activeWallet } = useWallet()
  const preferredWallet =
    wallets.find((wallet) => wallet.metadata.name.toLowerCase().includes('pera')) ?? wallets[0]

  if (activeAddress) {
    return (
      <div className="flex items-center gap-2">
        <div className="glass-container glass-container--rounded">
          <div className="glass-filter"></div>
          <div className="glass-overlay"></div>
          <div className="glass-specular"></div>
          <div className="glass-content px-4 py-2 flex items-center gap-3 text-sm font-medium text-white shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="font-mono text-xs">{activeAddress.slice(0, 4)}...{activeAddress.slice(-4)}</span>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => activeWallet?.disconnect()}
          className="glass-container glass-container--rounded text-white/60 transition hover:text-white flex items-center justify-center"
          style={{ borderRadius: '9999px' }}
          title="Disconnect"
        >
          <div className="glass-filter" style={{ borderRadius: '9999px' }}></div>
          <div className="glass-overlay" style={{ borderRadius: '9999px' }}></div>
          <div className="glass-specular" style={{ borderRadius: '9999px' }}></div>
          <div className="glass-content p-2.5 flex items-center justify-center">
            <X className="h-4 w-4" />
          </div>
        </motion.button>
      </div>
    )
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={() => preferredWallet?.connect()}
      className="glass-container glass-container--rounded text-white font-bold transition hover:scale-[1.01]"
    >
      <div className="glass-filter"></div>
      <div className="glass-overlay"></div>
      <div className="glass-specular"></div>
      <div className="glass-content px-6 py-3.5 flex items-center gap-2.5 justify-center">
        <Wallet className="h-4.5 w-4.5 text-current" />
        <span>
          {preferPera ? 'Connect Pera Wallet' : preferredWallet ? `Connect ${preferredWallet.metadata.name}` : 'Connect wallet'}
        </span>
      </div>
    </motion.button>
  )
}
