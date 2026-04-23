import { useWallet } from '@txnlab/use-wallet-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

// ── NFT Pass Asset IDs on Algorand Testnet ──
export const PASS_ASSETS = {
  silver: { assetId: 759169821, name: 'Gigo Silver Pass' },
  gold: { assetId: 759262915, name: 'Gigo Gold Pass' },
  platinum: { assetId: 759263033, name: 'Gigo Platinum Pass' },
} as const

export type PassTier = keyof typeof PASS_ASSETS

export interface PassInfo {
  tier: PassTier
  assetId: number
  name: string
  owned: boolean
  amount: number
  discount: number
  benefits: string[]
  validity: 'Weekly' | 'Monthly'
  validityDays: number
  priorityMatching: boolean
  zeroSurge: boolean
  /** Days remaining on this pass (0 if not activated or expired) */
  daysRemaining: number
  /** Whether the pass period is currently active */
  isActive: boolean
  /** Whether the user has a free ride available today */
  freeRideToday: boolean
  /** Date string of when the pass was activated */
  activatedAt: string | null
}

const INDEXER_BASE = 'https://testnet-idx.algonode.cloud'

const PASS_CONFIG: Record<
  PassTier,
  Omit<PassInfo, 'owned' | 'amount' | 'assetId' | 'name' | 'daysRemaining' | 'isActive' | 'freeRideToday' | 'activatedAt'>
> = {
  silver: {
    tier: 'silver',
    discount: 5,
    benefits: ['5% discount on paid rides', '1 free ride per day', 'Weekly validity (7 days)'],
    validity: 'Weekly',
    validityDays: 7,
    priorityMatching: false,
    zeroSurge: false,
  },
  gold: {
    tier: 'gold',
    discount: 10,
    benefits: ['10% discount on paid rides', '1 free ride per day', 'Priority driver matching', 'Monthly validity (30 days)'],
    validity: 'Monthly',
    validityDays: 30,
    priorityMatching: true,
    zeroSurge: false,
  },
  platinum: {
    tier: 'platinum',
    discount: 20,
    benefits: ['20% discount on paid rides', '1 free ride per day', 'Priority driver matching', 'Zero surge pricing', 'Monthly validity (30 days)'],
    validity: 'Monthly',
    validityDays: 30,
    priorityMatching: true,
    zeroSurge: true,
  },
}

// ── LocalStorage helpers for pass tracking ──
function getStorageKey(address: string, tier: PassTier, suffix: string) {
  return `gigo_pass_${address}_${tier}_${suffix}`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

function getActivationDate(address: string, tier: PassTier): string | null {
  return localStorage.getItem(getStorageKey(address, tier, 'activated'))
}

function setActivationDate(address: string, tier: PassTier) {
  localStorage.setItem(getStorageKey(address, tier, 'activated'), new Date().toISOString())
}

function getDaysRemaining(address: string, tier: PassTier, validityDays: number): number {
  const activatedStr = getActivationDate(address, tier)
  if (!activatedStr) return 0
  const activated = new Date(activatedStr)
  const now = new Date()
  const elapsed = Math.floor((now.getTime() - activated.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, validityDays - elapsed)
}

function isFreeRideUsedToday(address: string, tier: PassTier): boolean {
  const key = getStorageKey(address, tier, `freeride_${todayStr()}`)
  return localStorage.getItem(key) === 'used'
}

function markFreeRideUsed(address: string, tier: PassTier) {
  const key = getStorageKey(address, tier, `freeride_${todayStr()}`)
  localStorage.setItem(key, 'used')
}

export interface AlgorandAssetsResult {
  passes: PassInfo[]
  activeTier: PassTier | null
  activePass: PassInfo | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  applyDiscount: (fareInMicroAlgos: bigint) => bigint
  hasPriorityMatching: boolean
  hasZeroSurge: boolean
  /** Whether the user can take a free ride right now */
  freeRideAvailable: boolean
  /** Activate a pass (starts the validity countdown) */
  activatePass: (tier: PassTier) => void
  /** Mark today's free ride as used */
  useFreeRide: () => void
  /** Force re-render of pass state */
  refreshPassState: () => void
}

/**
 * Fetches user assets from Algorand Indexer and checks NFT pass ownership.
 * Tracks pass activation, validity period, and daily free ride usage via localStorage.
 */
export function useAlgorandAssets(): AlgorandAssetsResult {
  const { activeAddress } = useWallet()
  const [ownedAssetIds, setOwnedAssetIds] = useState<Map<number, number>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passStateVersion, setPassStateVersion] = useState(0) // bump to re-derive

  const checkUserPasses = useCallback(async (address: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${INDEXER_BASE}/v2/accounts/${address}`)
      if (!response.ok) {
        throw new Error(`Indexer returned ${response.status}`)
      }
      const data = await response.json()
      const assets: Array<{ 'asset-id': number; amount: number }> = data?.account?.assets ?? []

      const assetMap = new Map<number, number>()
      for (const tier of Object.values(PASS_ASSETS)) {
        const found = assets.find((a) => a['asset-id'] === tier.assetId)
        // Opt-in on Algorand adds asset with amount=0; treat opt-in as "subscribed"
        if (found) {
          assetMap.set(tier.assetId, Math.max(1, found.amount))
        }
      }
      setOwnedAssetIds(assetMap)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch assets'
      setError(message)
      setOwnedAssetIds(new Map())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeAddress) {
      void checkUserPasses(activeAddress)
    } else {
      setOwnedAssetIds(new Map())
      setError(null)
    }
  }, [activeAddress, checkUserPasses])

  // Derive pass info with activation/free-ride state
  const passes: PassInfo[] = useMemo(() => {
    // passStateVersion is used to trigger re-derivation
    void passStateVersion

    return (['silver', 'gold', 'platinum'] as PassTier[]).map((tier) => {
      const asset = PASS_ASSETS[tier]
      const config = PASS_CONFIG[tier]
      const amount = ownedAssetIds.get(asset.assetId) ?? 0
      const owned = amount > 0

      let daysRemaining = 0
      let isActive = false
      let freeRideToday = false
      let activatedAt: string | null = null

      if (owned && activeAddress) {
        activatedAt = getActivationDate(activeAddress, tier)
        daysRemaining = activatedAt ? getDaysRemaining(activeAddress, tier, config.validityDays) : config.validityDays
        isActive = daysRemaining > 0 || !activatedAt // active if not yet activated (pre-activation) or has days left
        freeRideToday = isActive && !isFreeRideUsedToday(activeAddress, tier)

        // Auto-activate on first detection if not already activated
        if (owned && !activatedAt) {
          setActivationDate(activeAddress, tier)
          activatedAt = new Date().toISOString()
          daysRemaining = config.validityDays
          isActive = true
          freeRideToday = true
        }
      }

      return {
        ...config,
        assetId: asset.assetId,
        name: asset.name,
        owned,
        amount,
        daysRemaining,
        isActive,
        freeRideToday,
        activatedAt,
      }
    })
  }, [ownedAssetIds, activeAddress, passStateVersion])

  // Use highest owned + active tier for benefits
  const activeTier: PassTier | null =
    passes.find((p) => p.tier === 'platinum' && p.owned && p.isActive)?.tier ??
    passes.find((p) => p.tier === 'gold' && p.owned && p.isActive)?.tier ??
    passes.find((p) => p.tier === 'silver' && p.owned && p.isActive)?.tier ??
    null

  const activePass = activeTier ? passes.find((p) => p.tier === activeTier) ?? null : null

  const freeRideAvailable = activePass?.freeRideToday ?? false

  const applyDiscount = useCallback(
    (fareInMicroAlgos: bigint): bigint => {
      if (!activePass) return fareInMicroAlgos
      const discountFraction = BigInt(100 - activePass.discount)
      return (fareInMicroAlgos * discountFraction) / 100n
    },
    [activePass],
  )

  const activatePass = useCallback(
    (tier: PassTier) => {
      if (!activeAddress) return
      if (!getActivationDate(activeAddress, tier)) {
        setActivationDate(activeAddress, tier)
      }
      setPassStateVersion((v) => v + 1)
    },
    [activeAddress],
  )

  const useFreeRide = useCallback(() => {
    if (!activeAddress || !activeTier) return
    markFreeRideUsed(activeAddress, activeTier)
    setPassStateVersion((v) => v + 1)
  }, [activeAddress, activeTier])

  const refreshPassState = useCallback(() => {
    setPassStateVersion((v) => v + 1)
  }, [])

  return {
    passes,
    activeTier,
    activePass,
    isLoading,
    error,
    refetch: () => {
      if (activeAddress) void checkUserPasses(activeAddress)
    },
    applyDiscount,
    hasPriorityMatching: activePass?.priorityMatching ?? false,
    hasZeroSurge: activePass?.zeroSurge ?? false,
    freeRideAvailable,
    activatePass,
    useFreeRide,
    refreshPassState,
  }
}
