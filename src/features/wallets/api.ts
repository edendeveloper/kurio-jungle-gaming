import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { isCurrentContext, contextConfig } from '@/lib/api/auth-context'
import { useSession } from '@/features/auth/session'
import type { WalletRecord } from '@/types/account'
export function useWallets(userId?: string) {
  const session = useSession()
  return useQuery({
    queryKey: ['wallets', session.data?.contextId],
    enabled:
      !!session.data?.user && (!userId || session.data.user.id === userId),
    queryFn: async ({ signal }) =>
      (
        await api.get<{ items: WalletRecord[] }>(
          '/wallets',
          contextConfig(session.data?.contextId, signal),
        )
      ).data,
    retry: false,
  })
}
export function useWalletMutation() {
  const session = useSession(),
    client = useQueryClient(),
    context = session.data?.contextId
  return useMutation({
    mutationKey: ['wallet-change', context],
    onMutate: () => ({ context }),
    mutationFn: async ({
      action,
      id,
      data,
    }: {
      action: 'save' | 'remove' | 'primary'
      id?: string
      data?: Partial<WalletRecord>
    }) => {
      if (action === 'remove')
        return (
          await api.delete<{ items: WalletRecord[] }>(
            `/wallets/${id}`,
            contextConfig(context),
          )
        ).data
      if (action === 'primary')
        return (
          await api.put<{ items: WalletRecord[] }>(
            `/wallets/${id}/primary`,
            undefined,
            contextConfig(context),
          )
        ).data
      return (
        await (id
          ? api.patch<{ items: WalletRecord[] }>(
              `/wallets/${id}`,
              data,
              contextConfig(context),
            )
          : api.post<{ items: WalletRecord[] }>(
              '/wallets',
              data,
              contextConfig(context),
            ))
      ).data
    },
    onSuccess: (data, _variables, snapshot) => {
      if (isCurrentContext(snapshot.context)) {
        client.setQueryData(['wallets', snapshot.context], data)
        void client.invalidateQueries({ queryKey: ['checkout-quote'] })
      }
    },
  })
}
