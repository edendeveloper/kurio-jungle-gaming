import { Link, useRouterState } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { PrimaryButton } from '@/components/ui/button'
import { useCart } from '@/features/cart/api'
import { useSession } from '@/features/auth/session'
import { safeReturnTo } from '@/features/auth/validation'

export function DesktopHeader({ cartQuantity }: { cartQuantity?: number }) {
  const cart = useCart()
  const session = useSession()
  const returnTo = useRouterState({
    select: (state) => safeReturnTo(state.location.href),
  })
  const isNft = useRouterState({
    select: (state) => state.location.pathname.startsWith('/nft/'),
  })
  const quantity =
    cartQuantity ??
    (cart.isError
      ? '?'
      : (cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0))
  return (
    <header className="desktop-header page-container">
      <Link to="/" className="wordmark" aria-label="KURIO — início">
        KURIO
      </Link>
      <nav aria-label="Navegação principal" className="desktop-links">
        <Link
          to="/"
          activeOptions={{ exact: true }}
          activeProps={{ 'aria-current': 'page' }}
        >
          Início
        </Link>
        <Link
          to="/marketplace"
          data-active-section={isNft || undefined}
          activeProps={{ 'aria-current': 'page' }}
        >
          Mercado
        </Link>
        <button type="button" aria-disabled="true" title="Criadores em breve">
          Criadores
        </button>
        <button type="button" aria-disabled="true" title="Aprenda em breve">
          Aprenda
        </button>
      </nav>
      <div className="header-actions">
        <Link
          to="/marketplace"
          className="icon-button"
          aria-label="Buscar NFTs"
          title="Buscar NFTs"
        >
          <img src="/assets/icons/search-desktop.svg" alt="" width="20" height="20" />
        </Link>
        <Link
          to="/cart"
          className="cart-link icon-button"
          aria-label={`Carrinho, ${quantity} itens`}
        >
          <img src="/assets/icons/cart-desktop.svg" alt="" width="24" height="24" />
          <Badge className="cart-badge">{quantity}</Badge>
        </Link>
        <PrimaryButton size="sm" asChild>
          <Link
            to={session.data?.user ? '/profile' : '/login'}
            search={session.data?.user ? {} : { returnTo, reason: undefined }}
          >
            <img src="/assets/icons/sign-in.svg" alt="" width="16" height="16" />
            {session.data?.user ? 'Minha conta' : 'Entrar'}
          </Link>
        </PrimaryButton>
      </div>
    </header>
  )
}
