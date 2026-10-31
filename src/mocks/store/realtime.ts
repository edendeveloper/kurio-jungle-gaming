import type { NftUpdatedEvent } from '@/types/realtime'
import { getNftRecords } from '../data/nft-detail'

const storageKey = 'kurio:realtime-state'
interface NftOverride {
  priceEth?: string
  availability?: number
  version: number
}
interface RealtimeState {
  nfts: Record<string, NftOverride>
  sequence: number
}

function readState(): RealtimeState {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (typeof value === 'object' && value !== null) {
      const state = value as Partial<RealtimeState>
      if (typeof state.nfts === 'object' && state.nfts !== null && Number.isSafeInteger(state.sequence))
        return { nfts: state.nfts, sequence: state.sequence! }
    }
  } catch {
    // Invalid demo storage is reset to a known state.
  }
  return { nfts: {}, sequence: 0 }
}

export function readNftOverride(id: string) {
  return readState().nfts[id]
}

export function updateMockNft(
  nftId: string,
  values: { priceEth?: string; availableQuantity?: number },
): NftUpdatedEvent | null {
  const nft = getNftRecords().find((record) => record.id === nftId)
  if (!nft) return null
  const state = readState()
  const current = state.nfts[nftId]
  const version = (current?.version ?? nft.version ?? 1) + 1
  state.sequence++
  state.nfts[nftId] = {
    version,
    priceEth: values.priceEth ?? current?.priceEth,
    availability: values.availableQuantity ?? current?.availability,
  }
  localStorage.setItem(storageKey, JSON.stringify(state))
  const updated = getNftRecords().find((record) => record.id === nftId)!
  return {
    eventId: `nft-${state.sequence}`,
    nftId,
    version,
    priceEth: updated.priceEth,
    availableQuantity: updated.availability,
    updatedAt: new Date().toISOString(),
  }
}

export function resetRealtimeState() {
  localStorage.removeItem(storageKey)
}
