import type { CheckoutQuote, PurchaseOrder } from '@/types/checkout'
import { currentSession } from './session'

export interface StoredCartRow {
  nftId: string
  edition: number
  quantity: number
}
export interface CartBucket {
  items: StoredCartRow[]
  couponCode: string | null
}
export interface CommerceState extends CartBucket {
  version: 3
  owner: string
  carts: Record<string, CartBucket>
  quotes: Record<string, CheckoutQuote>
  orders: Record<string, PurchaseOrder>
}
export function readCommerce(
  owner = currentSession().user?.id ?? 'guest',
): CommerceState {
  let raw: unknown
  try {
    raw = JSON.parse(localStorage.getItem('kurio:cart') ?? 'null')
  } catch {
    raw = null
  }
  const base =
    raw && !Array.isArray(raw) && typeof raw === 'object'
      ? (raw as Partial<CommerceState>)
      : {}
  const legacy = {
    items: Array.isArray(raw) ? (raw as StoredCartRow[]) : (base.items ?? []),
    couponCode: base.couponCode ?? null,
  }
  const carts =
    base.carts && typeof base.carts === 'object'
      ? base.carts
      : { guest: legacy }
  const bucket = carts[owner] ?? { items: [], couponCode: null }
  const items = new Map<string, StoredCartRow>()
  for (const row of bucket.items) {
    if (
      !row ||
      typeof row.nftId !== 'string' ||
      !Number.isSafeInteger(row.edition) ||
      !Number.isSafeInteger(row.quantity) ||
      row.quantity < 1
    )
      continue
    const key = `${row.nftId}:${row.edition}`
    items.set(key, {
      ...row,
      quantity: (items.get(key)?.quantity ?? 0) + row.quantity,
    })
  }
  return {
    version: 3,
    owner,
    carts,
    items: [...items.values()],
    couponCode: bucket.couponCode,
    quotes: base.quotes ?? {},
    orders: base.orders ?? {},
  }
}
export function writeCommerce(state: CommerceState) {
  const { owner, items, couponCode, ...base } = state
  localStorage.setItem(
    'kurio:cart',
    JSON.stringify({
      ...base,
      carts: { ...state.carts, [owner]: { items, couponCode } },
    }),
  )
}
export async function commerceTransaction<T>(
  action: () => T | Promise<T>,
): Promise<T> {
  return navigator.locks
    ? navigator.locks.request('kurio:commerce', action)
    : action()
}
