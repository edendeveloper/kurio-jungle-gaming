import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api/client'
import { isCurrentContext, contextConfig } from '@/lib/api/auth-context'
import { useSession } from '@/features/auth/session'
import type { FavoritesResponse } from '@/types/collector'
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
export function useNftFavorite(nftId: string) {
  const session = useSession(),
    client = useQueryClient()
  const userId = session.data?.user?.id
  const contextId = session.data?.contextId
  const key = ['favorites', contextId] as const
  const favorites = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async ({ signal }) =>
      (
        await api.get<FavoritesResponse>(
          '/favorites',
          contextConfig(contextId, signal),
        )
      ).data,
    retry: (count, error) =>
      count < 1 && (!(error instanceof ApiError) || error.status !== 401),
  })
  const mutation = useMutation({
    mutationKey: ['favorite', contextId, nftId],
    mutationFn: async (favorite: boolean) =>
      (
        await api.put<FavoritesResponse>(
          `/favorites/${encodeURIComponent(nftId)}`,
          { favorite },
          contextConfig(contextId),
        )
      ).data,
    onMutate: async (favorite) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<FavoritesResponse>(key)
      if (!isCurrentContext(contextId))
        return { previous: undefined, contextId }
      if (previous)
        client.setQueryData<FavoritesResponse>(key, {
          nftIds: favorite
            ? [...new Set([...previous.nftIds, nftId])]
            : previous.nftIds.filter((id) => id !== nftId),
        })
      return { previous, contextId }
    },
    onSuccess: (data, _variables, context) => {
      if (isCurrentContext(context.contextId))
        client.setQueryData(['favorites', context.contextId], data)
    },
    onError: (error, _favorite, context) => {
      if (!isCurrentContext(context?.contextId)) return
      if (context?.previous)
        client.setQueryData(['favorites', context.contextId], context.previous)
      if (error instanceof ApiError && error.status === 401) {
        client.removeQueries({ queryKey: key })
        void client.invalidateQueries({ queryKey: ['session'] })
      }
    },
  })
  return {
    session,
    favorites,
    mutation,
    isFavorite: favorites.data?.nftIds.includes(nftId) ?? false,
  }
}
