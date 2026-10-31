import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { isCurrentContext, contextConfig } from '@/lib/api/auth-context'
import { clearPrivateState, useSession } from '@/features/auth/session'
import type { CollectorProfile, AccountSession } from '@/types/account'
export function useProfile() {
  const session = useSession()
  return useQuery({
    queryKey: ['profile', session.data?.contextId],
    enabled: !!session.data?.user,
    queryFn: async ({ signal }) =>
      (
        await api.get<CollectorProfile>(
          '/profile',
          contextConfig(session.data?.contextId, signal),
        )
      ).data,
    retry: false,
  })
}
export function useProfileUpdate(
  kind: 'profile' | 'avatar' | 'remove-avatar' | 'password',
) {
  const session = useSession(),
    client = useQueryClient(),
    context = session.data?.contextId
  return useMutation({
    mutationKey: ['profile-change', context, kind],
    mutationFn: async (body: unknown) => {
      if (kind === 'password')
        return (
          await api.put('/profile/password', body, contextConfig(context))
        ).data as {
          changed: boolean
        }
      return (
        await (kind === 'profile'
          ? api.patch<CollectorProfile>(
              '/profile',
              body,
              contextConfig(context),
            )
          : kind === 'avatar'
            ? api.put<CollectorProfile>(
                '/profile/avatar',
                body,
                contextConfig(context),
              )
            : api.delete<CollectorProfile>(
                '/profile/avatar',
                contextConfig(context),
              ))
      ).data
    },
    onSuccess: async (data) => {
      if (!isCurrentContext(context) && kind !== 'password') return
      if (kind === 'password') {
        await clearPrivateState(client)
        client.setQueryData(['session'], {
          user: null,
          contextId: null,
          expiresAt: null,
        })
        return
      }
      const profile = data as CollectorProfile
      client.setQueryData(['profile', context], profile)
      client.setQueryData<AccountSession>(['session'], (old) =>
        old?.user && old.contextId === context
          ? {
              ...old,
              user: {
                id: profile.id,
                name: profile.displayName,
                email: profile.email,
                username: profile.username,
                avatarUrl: profile.avatarUrl,
              },
            }
          : old,
      )
    },
  })
}
