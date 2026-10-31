import { Link } from '@tanstack/react-router'

function DiscoverIcon() {
  return (
    <span className="discover-icon" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((index) => (
        <img
          key={index}
          className={`discover-part-${index}`}
          src={`/assets/icons/discover-${index}.svg`}
          alt=""
        />
      ))}
    </span>
  )
}
export function MobileNavigation() {
  return (
    <nav className="mobile-navigation" aria-label="Navegação mobile">
      <div className="mobile-navigation-surface" aria-hidden="true" />
      <div className="mobile-navigation-items">
        <Link
          to="/"
          aria-label="KURIO — início"
          activeOptions={{ exact: true }}
          activeProps={{ 'aria-current': 'page' }}
        >
          <img src="/assets/icons/home-mobile.svg" alt="" width="16" height="17" />
          <span className="sr-only">Início</span>
        </Link>
        <Link
          to="/profile/favorites"
          aria-label="Lista de interesse"
          activeProps={{ 'aria-current': 'page' }}
        >
          <img src="/assets/icons/heart-mobile.svg" alt="" width="20" height="18" />
        </Link>
        <Link
          to="/marketplace"
          aria-label="Marketplace"
          className="mobile-discover"
          activeProps={{ 'aria-current': 'page' }}
        >
          <img
            className="mobile-medallion"
            src="/assets/decorations/navigation-medallion.svg"
            alt=""
          />
          <DiscoverIcon />
        </Link>
        <Link
          to="/cart"
          aria-label="Carrinho"
          activeProps={{ 'aria-current': 'page' }}
        >
          <img src="/assets/icons/shop-mobile.svg" alt="" width="20" height="20" />
        </Link>
        <Link
          to="/profile"
          aria-label="Perfil"
          activeProps={{ 'aria-current': 'page' }}
        >
          <img src="/assets/icons/user-mobile.svg" alt="" width="20" height="20" />
        </Link>
      </div>
    </nav>
  )
}
