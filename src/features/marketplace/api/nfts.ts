import { api } from '@/lib/api/client'
import type { CatalogFilters, CatalogResponse } from '../types/catalog'

export async function fetchNFTs(filters: CatalogFilters, signal: AbortSignal) {
  const response = await api.get<CatalogResponse>('/nfts', {
    params: filters,
    signal,
  })
  return response.data
}
