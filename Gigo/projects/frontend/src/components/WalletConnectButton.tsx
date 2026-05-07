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
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-sm font-medium text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
          {activeAddress.slice(0, 4)}...{activeAddress.slice(-4)}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => activeWallet?.disconnect()}
          className="rounded-full border border-white/10 bg-white/10 p-2.5 text-white/60 transition hover:bg-white/20 hover:text-white"
          title="Disconnect"
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>
    )
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={() => preferredWallet?.connect()}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-[0_18px_40px_rgba(255,255,255,0.12)] transition hover:bg-white/92"
    >
      <Wallet className="h-4 w-4" />
      {preferPera ? 'Connect Pera Wallet' : preferredWallet ? `Connect ${preferredWallet.metadata.name}` : 'Connect wallet'}
    </motion.button>
  )
}
