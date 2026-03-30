export const algorandConfig = {
  algodServer: import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
  algodPort: import.meta.env.VITE_ALGOD_PORT || '',
  algodToken: import.meta.env.VITE_ALGOD_TOKEN || '',
  appId: import.meta.env.VITE_RIDE_APP_ID ? BigInt(import.meta.env.VITE_RIDE_APP_ID) : 757618327n,
}
