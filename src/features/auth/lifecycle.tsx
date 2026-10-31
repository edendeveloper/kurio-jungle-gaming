import { useEffect, useRef } from 'react'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import { useRouter, useRouterState, Navigate } from '@tanstack/react-router'
import { clearPrivateState, useSession } from './session'
import { safeReturnTo, isPrivatePath } from './validation'
import { privatePrefixes } from '@/lib/api/auth-context'

export function AuthLifecycle() {
  const session = useSession(),
    client = useQueryClient(),
    router = useRouter()
  const previous = useRef<string | null | undefined>(undefined)
  const refreshing = useRef(false)
  useEffect(() => {
    const context = session.data?.contextId
    if (session.isSuccess && context !== previous.current) {
      const old = previous.current
      previous.current = context
      if (old !== undefined) {
        const predicate = (query: { queryKey: readonly unknown[] }) =>
          privatePrefixes.has(String(query.queryKey[0])) &&
          !query.queryKey.includes(context ?? 'guest')
        void client.cancelQueries({ predicate }).then(() => {
          client.removeQueries({ predicate })
          // Logout has its own explicit public destination. Re-running the old
          // private route here would race that navigation and reopen login.
          if (client.isMutating({ mutationKey: ['authentication', 'logout'] }))
            return
          return router.invalidate()
        })
      }
    }
  }, [session.data?.contextId, session.isSuccess, client, router])
  useEffect(() => {
    const refresh = () => {
      if (refreshing.current) return
      refreshing.current = true
      void client
        .cancelQueries({ queryKey: ['session'] })
        .then(() => clearPrivateState(client))
        .then(() => client.resetQueries({ queryKey: ['session'] }))
        .finally(() => {
          refreshing.current = false
        })
    }
    window.addEventListener('kurio:unauthorized', refresh)
    const remaining = session.data?.expiresAt
      ? Math.max(0, session.data.expiresAt - Date.now())
      : undefined
    const timer =
      remaining === undefined ? undefined : setTimeout(refresh, remaining + 20)
    const sync = () => {
      void client.invalidateQueries({ queryKey: ['session'] })
    }
    window.addEventListener('focus', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('kurio:unauthorized', refresh)
      window.removeEventListener('focus', sync)
      window.removeEventListener('storage', sync)
      if (timer) clearTimeout(timer)
    }
  }, [session.data?.expiresAt, client])
  const merge = session.data?.cartMerge
  if (session.isError)
    return (
      <p role="status" className="account-notice">
        Não foi possível validar a sessão.{' '}
        <button onClick={() => void session.refetch()}>
          Tentar validar sessão
        </button>
      </p>
    )
  return merge && merge.remainingGuestQuantity > 0 ? (
    <p role="status" className="account-notice">
      {merge.addedQuantity} itens conciliados. {merge.remainingGuestQuantity}{' '}
      itens continuam no carrinho visitante por falta de disponibilidade. Saia
      da conta para revisá-los.
    </p>
  ) : null
}
export function ProtectedContent({ children }: { children: React.ReactNode }) {
  const loggingOut =
    useIsMutating({ mutationKey: ['authentication', 'logout'] }) > 0
  const session = useSession(),
    location = useRouterState({ select: (state) => state.location })
  if (loggingOut && !session.data?.user) return <p role="status">Saindo…</p>
  if (session.isPending) return <p role="status">Validando sessão…</p>
  if (session.isError)
    return (
      <div role="alert">
        Não foi possível validar a sessão.{' '}
        <button onClick={() => void session.refetch()}>Tentar novamente</button>
      </div>
    )
  // The old route can render once with the next location during transitions.
  // Never let its guard redirect an already public destination back to login.
  if (!session.data.user && !isPrivatePath(location.pathname)) return null
  if (!session.data.user)
    return (
      <Navigate
        to="/login"
        search={{
          returnTo: safeReturnTo(location.href),
          reason: session.data.reason,
        }}
        replace
      />
    )
  return <div key={session.data.contextId}>{children}</div>
}
