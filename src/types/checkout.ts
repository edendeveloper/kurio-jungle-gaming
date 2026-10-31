import type { CartItem } from './collector.ts'
import type { NftNetwork } from './nft.ts'
import type { MoneyTotals, CouponResult } from '../lib/money.ts'

export type WalletProvider = 'walletconnect' | 'metamask' | 'coinbase'
export interface CheckoutWallet {
  savedWalletId?: string
  address: string
  network: NftNetwork
  provider: WalletProvider
  ens?: string
}
export interface SavedWallet extends CheckoutWallet {
  id: string
  label: string
}
export interface CollectorData {
  displayName: string
  username: string
  email: string
  profile?: string
  notes?: string
}
export interface CheckoutPayload {
  quoteId: string
  collector: CollectorData
  wallet: CheckoutWallet
}
export interface CheckoutQuote {
  id: string
  userId: string
  cartVersion: string
  items: CartItem[]
  totals: MoneyTotals
  coupon: CouponResult | null
  network: NftNetwork
  expiresAt: number
}
export interface PurchaseOrder {
  id: string
  userId: string
  idempotencyKey: string
  fingerprint: string
  status: 'processing' | 'confirmed' | 'rejected'
  createdAt: string
  confirmedAt?: string
  simulatedTransactionId?: string
  items: CartItem[]
  totals: MoneyTotals
  coupon: CouponResult | null
  collector: CollectorData
  wallet: CheckoutWallet
  reason?: string
  errorCode?: string
  resolveAt: number
  outcome: 'confirmed' | 'rejected'
  version?: number
}
