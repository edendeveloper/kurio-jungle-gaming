import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api/client'
import { contextConfig, isCurrentContext } from '@/lib/api/auth-context'
import { useSession } from '@/features/auth/session'
import type { FavoritesResponse } from '@/types/collector'

export function useFavorites() {
  const session = useSession()
  const contextId = session.data?.contextId
  const favorites = useQuery({
    queryKey: ['favorites', contextId],
    enabled: !!session.data?.user,
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
  return { session, favorites, contextId }
}

export function useNftFavorite(nftId: string) {
  const { session, favorites, contextId } = useFavorites()
  const client = useQueryClient()
  const key = ['favorites', contextId] as const
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
