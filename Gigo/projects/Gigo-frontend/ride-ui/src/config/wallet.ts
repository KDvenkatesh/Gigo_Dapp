import { NetworkId, WalletId, WalletManager } from '@txnlab/use-wallet-react'

export const walletManager = new WalletManager({
  wallets: [WalletId.PERA],
  defaultNetwork: NetworkId.TESTNET,
})
