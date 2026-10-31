import { contextConfig } from '@/lib/api/auth-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api/client'
import { useAuthAction, useSession } from '@/features/auth/session'
export { useWallets } from '@/features/wallets/api'
import type {
  CheckoutPayload,
  CheckoutQuote,
  PurchaseOrder,
} from '@/types/checkout'
import type { NftNetwork } from '@/types/nft'

export interface CheckoutAttempt {
  key: string
  userId: string
  body: CheckoutPayload
}
const attemptKey = 'kurio:checkout-attempt'
export function readAttempt(userId?: string): CheckoutAttempt | null {
  try {
    if (!userId) return null
    const value = JSON.parse(
      sessionStorage.getItem(`${attemptKey}:${userId}`) ??
        sessionStorage.getItem(attemptKey) ??
        'null',
    )
    return value &&
      typeof value.key === 'string' &&
      value.userId === userId &&
      typeof value.body?.quoteId === 'string'
      ? value
      : null
  } catch {
    return null
  }
}
export function saveAttempt(value: CheckoutAttempt) {
  sessionStorage.setItem(`${attemptKey}:${value.userId}`, JSON.stringify(value))
}
export function clearAttempt(userId?: string) {
  if (userId) sessionStorage.removeItem(`${attemptKey}:${userId}`)
  const legacy = sessionStorage.getItem(attemptKey)
  if (legacy && JSON.parse(legacy).userId === userId)
    sessionStorage.removeItem(attemptKey)
}
export function useDemoSession() {
  return useAuthAction('demo')
}
export function useQuote(
  userId: string,
  cartVersion: string,
  network: NftNetwork,
) {
  const session = useSession()
  return useQuery({
    queryKey: [
      'checkout-quote',
      session.data?.contextId,
      userId,
      cartVersion,
      network,
    ],
    queryFn: async ({ signal }) =>
      (
        await api.post<CheckoutQuote>(
          '/checkout/quote',
          { network },
          contextConfig(session.data?.contextId, signal),
        )
      ).data,
    staleTime: 0,
    retry: false,
  })
}
export function useCreateOrder() {
  const session = useSession()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (attempt: CheckoutAttempt) =>
      (
        await api.post<PurchaseOrder>('/orders', attempt.body, {
          headers: {
            ...contextConfig(session.data?.contextId).headers,
            'Idempotency-Key': attempt.key,
          },
        })
      ).data,
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401)
        void client.invalidateQueries({ queryKey: ['session'] })
    },
  })
}
export function useActiveOrder(userId: string) {
  const session = useSession()
  return useQuery({
    queryKey: ['active-order', session.data?.contextId, userId],
    queryFn: async ({ signal }) =>
      (
        await api.get<{ order: PurchaseOrder | null }>(
          '/orders/active',
          contextConfig(session.data?.contextId, signal),
        )
      ).data,
    staleTime: 0,
  })
}
export function useAttemptOrder(attempt: CheckoutAttempt) {
  const session = useSession()
  return useQuery({
    queryKey: [
      'order-attempt',
      session.data?.contextId,
      attempt.userId,
      attempt.key,
    ],
    queryFn: async ({ signal }) =>
      (
        await api.get<PurchaseOrder>(
          `/orders/attempt/${encodeURIComponent(attempt.key)}`,
          contextConfig(session.data?.contextId, signal),
        )
      ).data,
    retry: false,
    staleTime: 0,
  })
}
export function useOrder(id: string | undefined, userId: string | undefined) {
  const session = useSession()
  return useQuery({
    queryKey: ['order', session.data?.contextId, userId, id],
    enabled: !!id && !!userId,
    queryFn: async ({ signal }) =>
      (
        await api.get<PurchaseOrder>(
          `/orders/${encodeURIComponent(id!)}`,
          contextConfig(session.data?.contextId, signal),
        )
      ).data,
    refetchInterval: (query) =>
      query.state.data?.status === 'processing' ? 800 : false,
    retry: (count, error) =>
      count < 1 &&
      (!(error instanceof ApiError) || !error.status || error.status >= 500),
  })
}
