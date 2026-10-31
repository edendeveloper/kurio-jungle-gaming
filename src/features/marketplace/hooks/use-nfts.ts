import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'
import { fetchNFTs } from '../api/nfts'
import type { CatalogSearch, CatalogFilters } from '../types/catalog'
import { normalizeFilters, sameFilterSet } from '../utils/filters'

export function useNFTs(search: CatalogSearch) {
  const filters = normalizeFilters(search)
  return useQuery({
    queryKey: ['nfts', filters] as const,
    queryFn: ({ signal }) => fetchNFTs(filters, signal),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: (count, error) =>
      count < 1 &&
      (!(error instanceof ApiError) || !error.status || error.status >= 500),
    retryDelay: 200,
    placeholderData: (previous, previousQuery) => {
      const previousFilters = previousQuery?.queryKey[1] as
        CatalogFilters | undefined
      return previousFilters && sameFilterSet(previousFilters, filters)
        ? previous
        : undefined
    },
  })
}
