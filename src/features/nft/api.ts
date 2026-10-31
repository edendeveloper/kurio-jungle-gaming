import { api } from '@/lib/api/client'
import type { NftDetail } from '@/types/nft-detail'
import type { Nft } from '@/types/nft'

export async function fetchNft(id: string, signal: AbortSignal) {
  return (
    await api.get<NftDetail>(`/nfts/${encodeURIComponent(id)}`, { signal })
  ).data
}
export async function fetchRelatedNfts(id: string, signal: AbortSignal) {
  return (
    await api.get<{ items: Nft[] }>(`/nfts/${encodeURIComponent(id)}/related`, {
      signal,
    })
  ).data
}
