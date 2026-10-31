import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api/client'
import {
  cancelPrivateRequests,
  privatePrefixes,
  contextConfig,
  sessionToken,
} from '@/lib/api/auth-context'
import type { CollectorSession } from '@/types/collector'
import type { LoginInput, RegistrationInput } from '@/types/account'
import { useNavigate } from '@tanstack/react-router'

export const sessionOptions = queryOptions({
  queryKey: ['session'],
  queryFn: async ({ signal }) => {
    const context = sessionToken()
    try {
      return (await api.get<CollectorSession>('/session', { signal })).data
    } catch (error) {
      // Missing/expired credentials are an expected anonymous session. Other
      // failures must remain errors: they cannot establish the user's identity.
      if (!(error instanceof ApiError) || error.status !== 401) throw error
      if (sessionToken() !== context || signal.aborted) throw error
      if (context !== 'guest')
        document.cookie = 'kurio_session=; Path=/; Max-Age=0; SameSite=Strict'
      return {
        user: null,
        contextId: null,
        expiresAt: null,
        ...(context !== 'guest' ? { reason: 'expired' as const } : {}),
      }
    }
  },
  staleTime: 0,
  retry: false,
})
export function useSession() {
  const query = useQuery(sessionOptions)
  const authStatus = query.isPending
    ? 'checking'
    : query.isError
      ? 'unavailable'
      : query.data.user
        ? 'authenticated'
        : 'anonymous'
  return { ...query, authStatus }
}
export async function clearPrivateState(client: QueryClient) {
  cancelPrivateRequests()
  await client.cancelQueries({
    predicate: (query) => privatePrefixes.has(String(query.queryKey[0])),
  })
  client.removeQueries({
    predicate: (query) => privatePrefixes.has(String(query.queryKey[0])),
  })
  const mutations = client.getMutationCache()
  for (const mutation of mutations.getAll()) {
    // Keep the current authentication transition observable until its redirect
    // completes. Removing it early loses pending state and unmounts callbacks.
    if (
      mutation.options.mutationKey?.[0] === 'authentication' &&
      mutation.state.status === 'pending'
    )
      continue
    mutations.remove(mutation)
  }
}
export function useAuthAction(kind: 'login' | 'register' | 'logout' | 'demo') {
  const client = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationKey: ['authentication', kind],
    gcTime: 0,
    mutationFn: async (input: LoginInput | RegistrationInput | undefined) =>
      (
        await api.post<CollectorSession>(
          `/session/${kind}`,
          input,
          kind === 'logout'
            ? contextConfig(
                client.getQueryData<CollectorSession>(['session'])?.contextId,
              )
            : undefined,
        )
      ).data,
    onMutate: async () => {
      const userId = client.getQueryData<CollectorSession>(['session'])?.user
        ?.id
      await clearPrivateState(client)
      return { userId }
    },
    onSuccess: async (session, _input, snapshot) => {
      await clearPrivateState(client)
      if (kind === 'logout' && snapshot.userId)
        sessionStorage.removeItem(`kurio:checkout-draft:${snapshot.userId}`)
      // This callback survives the account screen unmounting during logout.
      // Leave the private route before publishing the anonymous session.
      if (kind === 'logout')
        await navigate({ to: '/marketplace', replace: true })
      client.setQueryData(['session'], session)
    },
    onError: () => client.invalidateQueries({ queryKey: ['session'] }),
  })
}
