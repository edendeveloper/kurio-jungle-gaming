import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { CartResponse } from '@/types/collector'
import { useSession } from '@/features/auth/session'
import {
  isCurrentContext,
  contextConfig,
  sessionToken,
} from '@/lib/api/auth-context'

export function useCart() {
  const session = useSession()
  return useQuery({
    queryKey: ['cart', session.data?.contextId ?? 'guest'],
    enabled: !session.isPending || sessionToken() === 'guest',
    queryFn: async ({ signal }) => {
      // A failed identity check must be visible, rather than leaving a disabled
      // cart query permanently pending or treating an account as a guest.
      if (session.isError && sessionToken() !== 'guest') throw session.error
      return (
        await api.get<CartResponse>(
          '/cart',
          contextConfig(session.data?.contextId, signal),
        )
      ).data
    },
  })
}
export function useAddToCart() {
  const client = useQueryClient()
  const session = useSession(),
    context = session.data?.contextId ?? 'guest'
  return useMutation({
    mutationKey: ['cart-add', context],
    onMutate: () => ({ context }),
    mutationFn: async (item: {
      nftId: string
      edition: number
      quantity: number
    }) =>
      (
        await api.post<CartResponse>(
          '/cart/items',
          item,
          contextConfig(context),
        )
      ).data,
    onSuccess: (data, _variables, snapshot) => {
      if (isCurrentContext(snapshot.context))
        client.setQueryData(['cart', snapshot.context], data)
    },
    onError: (_error, item) => {
      void client.invalidateQueries({ queryKey: ['nft', item.nftId] })
      void client.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

export type CartUpdate =
  | { type: 'quantity'; nftId: string; edition: number; quantity: number }
  | { type: 'remove'; nftId: string; edition: number }
  | { type: 'coupon'; code: string }
  | { type: 'clear-coupon' }
export function useUpdateCart() {
  const client = useQueryClient()
  const session = useSession(),
    context = session.data?.contextId ?? 'guest'
  return useMutation({
    mutationKey: ['cart-update', context],
    onMutate: () => ({ context }),
    mutationFn: async (change: CartUpdate) => {
      if (change.type === 'coupon')
        return (
          await api.post<CartResponse>(
            '/cart/coupon',
            { code: change.code },
            contextConfig(context),
          )
        ).data
      if (change.type === 'clear-coupon')
        return (
          await api.delete<CartResponse>('/cart/coupon', contextConfig(context))
        ).data
      const path = `/cart/items/${encodeURIComponent(change.nftId)}/${change.edition}`
      return change.type === 'remove'
        ? (await api.delete<CartResponse>(path, contextConfig(context))).data
        : (
            await api.patch<CartResponse>(
              path,
              { quantity: change.quantity },
              contextConfig(context),
            )
          ).data
    },
    onSuccess: (data, _variables, snapshot) => {
      if (!isCurrentContext(snapshot.context)) return
      client.setQueryData(['cart', snapshot.context], data)
      void client.invalidateQueries({ queryKey: ['checkout-quote'] })
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}
