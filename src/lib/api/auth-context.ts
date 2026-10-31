let version = 0
const controllers = new Set<AbortController>()
export const contextConfig = (
  context?: string | null,
  signal?: AbortSignal,
) => ({ headers: { 'X-Kurio-Session': context ?? 'guest' }, signal })
export const authVersion = () => version
export function sessionToken() {
  return (
    document.cookie
      .split('; ')
      .find((value) => value.startsWith('kurio_session='))
      ?.split('=')[1] ?? 'guest'
  )
}
export const isCurrentContext = (context: string | null | undefined) =>
  (context ?? 'guest') === sessionToken()
export function trackPrivateRequest(controller: AbortController) {
  controllers.add(controller)
  return () => controllers.delete(controller)
}
export function cancelPrivateRequests() {
  version++
  for (const controller of controllers) controller.abort()
  controllers.clear()
}
export const privatePrefixes = new Set([
  'cart',
  'favorites',
  'profile',
  'wallets',
  'checkout-quote',
  'active-order',
  'order-attempt',
  'order',
])
