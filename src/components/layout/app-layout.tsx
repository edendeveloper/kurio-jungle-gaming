import { Suspense } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { DesktopHeader } from './desktop-header'
import { DesktopFooter } from './desktop-footer'
import { MobileNavigation } from './mobile-navigation'
import { AuthLifecycle } from '@/features/auth/lifecycle'
import { useSession } from '@/features/auth/session'

export function AppLayout() {
  const session = useSession()
  const isAuth = useRouterState({
    select: (state) =>
      ['/login', '/register'].includes(state.location.pathname),
  })
  const isHome = useRouterState({
    select: (state) => state.location.pathname === '/',
  })
  const isNft = useRouterState({
    select: (state) => state.location.pathname.startsWith('/nft/'),
  })
  const isConfirmation = useRouterState({
    select: (state) => state.location.pathname === '/checkout/success',
  })
  const isCommerce = useRouterState({
    select: (state) => state.location.pathname === '/checkout',
  })
  return (
    <div
      data-auth-state={session.authStatus}
      className={
        isConfirmation
          ? 'app-shell confirmation-shell'
          : isCommerce
            ? 'app-shell commerce-shell'
            : isNft
          ? 'app-shell nft-shell'
          : isAuth
            ? 'app-shell auth-shell'
            : 'app-shell'
      }
    >
      <AuthLifecycle />
      <a href="#main" className="skip-link">
        Pular para o conteúdo
      </a>
      {!isConfirmation && <DesktopHeader />}
      <main
        id="main"
        tabIndex={-1}
        className={
          isHome
            ? 'home-main page-container'
            : `route-main page-container${isNft ? ' nft-route' : ''}`
        }
      >
        <Suspense
          fallback={
            isNft ? (
              <div
                className="nft-route-pending"
                role="status"
                aria-label="Carregando detalhes do NFT"
              >
                <span className="sr-only">Carregando detalhes do NFT…</span>
              </div>
            ) : (
              <p role="status">Carregando página…</p>
            )
          }
        >
          <Outlet />
        </Suspense>
      </main>
      {!isConfirmation && <DesktopFooter />}
      {!isNft && !isAuth && !isConfirmation && <MobileNavigation />}
    </div>
  )
}
