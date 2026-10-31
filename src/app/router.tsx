import {
  createRootRoute,
  createRoute,
  createRouter,
  stringifySearchWith,
  redirect,
} from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { PagePlaceholder } from '@/components/layout/page-placeholder'
import { HomePage } from '@/features/marketplace/home-page'
import { validateCatalogSearch } from '@/features/marketplace/utils/filters'
import { queryClient } from './query-client'
import { sessionOptions } from '@/features/auth/session'
import { ProtectedContent } from '@/features/auth/lifecycle'
import { safeReturnTo } from '@/features/auth/validation'
import {
  LazyAuthPage,
  LazyCartPage,
  LazyCheckoutPage,
  LazyCheckoutSuccessPage,
  LazyFavoritesPage,
  LazyMarketplacePage,
  LazyNftPage,
  LazyProfilePage,
  LazyWalletsPage,
} from './route-pages'

async function requireSession({ location }: { location: { href: string } }) {
  const session = await queryClient.fetchQuery(sessionOptions)
  if (!session.user)
    throw redirect({
      to: '/login',
      search: { returnTo: safeReturnTo(location.href), reason: session.reason },
      replace: true,
    })
}

const rootRoute = createRootRoute({
  component: AppLayout,
  errorComponent: ({ error }) => (
    <div role="alert">
      <h1>Não foi possível carregar a página</h1>
      <p>{error instanceof Error ? error.message : 'Tente novamente.'}</p>
      <button onClick={() => void router.invalidate()}>Tentar novamente</button>
    </div>
  ),
  notFoundComponent: () => (
    <PagePlaceholder
      title="Página não encontrada"
      description="O endereço solicitado não existe."
    />
  ),
})
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: validateCatalogSearch,
  component: HomePage,
})
const marketplaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/marketplace',
  validateSearch: validateCatalogSearch,
  component: LazyMarketplacePage,
})
const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: renderNftRoute,
})
function renderNftRoute() {
  const { nftId } = nftRoute.useParams()
  return <LazyNftPage nftId={nftId} />
}
const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: LazyCartPage,
})
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  beforeLoad: requireSession,
  pendingComponent: () => <p role="status">Validando sessão…</p>,
  component: () => (
    <ProtectedContent>
      <LazyCheckoutPage />
    </ProtectedContent>
  ),
})
const successRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout/success',
  beforeLoad: requireSession,
  validateSearch: (input: Record<string, unknown>): { orderId?: string } => ({
    orderId:
      typeof input.orderId === 'string' &&
      /^KUR-[a-zA-Z0-9-]{1,100}$/.test(input.orderId)
        ? input.orderId
        : undefined,
  }),
  component: renderSuccessRoute,
})
function renderSuccessRoute() {
  return (
    <ProtectedContent>
      <LazyCheckoutSuccessPage orderId={successRoute.useSearch().orderId} />
    </ProtectedContent>
  )
}
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: requireSession,
  component: () => (
    <ProtectedContent>
      <LazyProfilePage />
    </ProtectedContent>
  ),
})
const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/wallets',
  validateSearch: (input: Record<string, unknown>): { returnTo?: string } => ({
    returnTo:
      typeof input.returnTo === 'string'
        ? safeReturnTo(input.returnTo)
        : undefined,
  }),
  beforeLoad: requireSession,
  component: () => (
    <ProtectedContent>
      <LazyWalletsPage />
    </ProtectedContent>
  ),
})
const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/favorites',
  beforeLoad: requireSession,
  component: () => (
    <ProtectedContent>
      <LazyFavoritesPage />
    </ProtectedContent>
  ),
})

const authSearch = (input: Record<string, unknown>) => ({
  returnTo: safeReturnTo(input.returnTo),
  reason: typeof input.reason === 'string' ? input.reason : undefined,
})
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: authSearch,
  component: () => {
    const search = loginRoute.useSearch()
    return (
      <LazyAuthPage
        mode="login"
        returnTo={search.returnTo}
        reason={search.reason}
      />
    )
  },
})
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  validateSearch: authSearch,
  component: () => {
    const search = registerRoute.useSearch()
    return (
      <LazyAuthPage
        mode="register"
        returnTo={search.returnTo}
        reason={search.reason}
      />
    )
  },
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  homeRoute,
  marketplaceRoute,
  nftRoute,
  cartRoute,
  checkoutRoute,
  successRoute,
  profileRoute,
  walletsRoute,
  favoritesRoute,
])
export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  parseSearch: (searchString) => {
    const params = new URLSearchParams(searchString)
    const result: Record<string, unknown> = {}
    for (const key of new Set(params.keys())) {
      const values = params.getAll(key)
      const value = values[0]
      result[key] =
        values.length > 1
          ? values
          : (key === 'page' || key === 'pageSize') &&
              /^\d+$/.test(value) &&
              Number.isSafeInteger(Number(value))
            ? Number(value)
            : value
    }
    return result
  },
  stringifySearch: stringifySearchWith(JSON.stringify),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
