export const algorandConfig = {
  algodServer: import.meta.env.VITE_ALGORAND_NODE || 'https://testnet-api.algonode.cloud',
  algodPort: import.meta.env.VITE_ALGOD_PORT || '',
  algodToken: import.meta.env.VITE_ALGOD_TOKEN || '',
  appId: import.meta.env.VITE_RIDE_APP_ID ? BigInt(import.meta.env.VITE_RIDE_APP_ID) : 764183368n,
  gigcAssetId: import.meta.env.VITE_GIGC_ASSET_ID ? Number(import.meta.env.VITE_GIGC_ASSET_ID) : 763011769,
};
