import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'
import type { CatalogResponse } from '@/features/marketplace/types/catalog'
import { fetchNft, fetchRelatedNfts } from './api'

export function useNft(id: string) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['nft', id],
    queryFn: ({ signal }) => fetchNft(id, signal),
    staleTime: 30_000,
    retry: (count, error) =>
      count < 1 &&
      (!(error instanceof ApiError) || !error.status || error.status >= 500),
    retryDelay: 200,
  })
  useEffect(() => {
    if (!query.data) return
    const nft = query.data
    client.setQueriesData<CatalogResponse>({ queryKey: ['nfts'] }, (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.id === nft.id
                ? {
                    ...item,
                    priceEth: nft.priceEth,
                    availability: nft.availability,
                  }
                : item,
            ),
          }
        : old,
    )
    // A price change may also affect sorting/filter membership. Revalidate on the next catalog visit.
    void client.invalidateQueries({ queryKey: ['nfts'], refetchType: 'none' })
  }, [query.data, client])
  return query
}
export function useRelatedNfts(id: string) {
  return useQuery({
    queryKey: ['nft-related', id],
    queryFn: ({ signal }) => fetchRelatedNfts(id, signal),
    staleTime: 30_000,
  })
}
