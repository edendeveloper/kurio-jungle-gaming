import type { Nft } from './nft.ts'
import type { MoneyTotals, CouponResult } from '../lib/money.ts'

export type { AccountSession as CollectorSession } from './account.ts'
export interface FavoritesResponse {
  nftIds: string[]
}
export interface CartItem {
  nftId: string
  edition: number
  quantity: number
  nft: Nft
  subtotalEth: string
}
export interface CartResponse {
  items: CartItem[]
  totals: MoneyTotals
  coupon: CouponResult | null
  version: string
}
