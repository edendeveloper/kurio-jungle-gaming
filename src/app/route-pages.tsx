import { lazy } from 'react'

export const LazyMarketplacePage = lazy(() =>
  import('@/features/marketplace/page').then((module) => ({
    default: module.MarketplacePage,
  })),
)
export const LazyNftPage = lazy(() =>
  import('@/features/nft/page').then((module) => ({ default: module.NftPage })),
)
export const LazyCartPage = lazy(() =>
  import('@/features/cart/page').then((module) => ({ default: module.CartPage })),
)
export const LazyCheckoutPage = lazy(() =>
  import('@/features/checkout/page').then((module) => ({
    default: module.CheckoutPage,
  })),
)
export const LazyCheckoutSuccessPage = lazy(() =>
  import('@/features/checkout/page').then((module) => ({
    default: module.CheckoutSuccessPage,
  })),
)
export const LazyProfilePage = lazy(() =>
  import('@/features/profile/page').then((module) => ({
    default: module.ProfilePage,
  })),
)
export const LazyWalletsPage = lazy(() =>
  import('@/features/wallets/page').then((module) => ({
    default: module.WalletsPage,
  })),
)
export const LazyAuthPage = lazy(() =>
  import('@/features/auth/page').then((module) => ({ default: module.AuthPage })),
)
