import { calculateTotals, lineSubtotal } from '@/lib/money'
import type { CartResponse } from '@/types/collector'
import { getNftRecords } from '../data/nft-detail'
import { readCommerce } from './persistence'

export { CommerceError } from './errors'
import { CommerceError } from './errors'
export function requireUser(id?: string) {
  if (!id)
    throw new CommerceError(
      'Entre no modo de demonstração para continuar.',
      401,
      'AUTH_REQUIRED',
    )
  return id
}
export function cartResponse(state = readCommerce()): CartResponse {
  const records = getNftRecords()
  const items = state.items.flatMap((item) => {
    const nft = records.find((nft) => nft.id === item.nftId)
    return nft
      ? [
          {
            ...item,
            nft,
            subtotalEth: lineSubtotal(nft.priceEth, item.quantity),
          },
        ]
      : []
  })
  let money = calculateTotals(
    items.map((item) => ({ ...item.nft, quantity: item.quantity })),
    state.couponCode,
  )
  if (
    state.couponCode &&
    localStorage.getItem('kurio:coupon-scenario') === 'expired'
  )
    money = {
      ...calculateTotals(
        items.map((item) => ({ ...item.nft, quantity: item.quantity })),
      ),
      coupon: {
        code: state.couponCode,
        status: 'expired',
        message: 'Este cupom expirou. Remova-o e revise o pedido.',
      },
    }
  const fingerprint = JSON.stringify({
    items: items.map((item) => [
      item.nftId,
      item.edition,
      item.quantity,
      item.nft.priceEth,
      item.nft.availability,
    ]),
    ...money,
  })
  let hash = 2166136261
  for (const char of fingerprint)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return { items, ...money, version: `cart-${hash >>> 0}` }
}
export function assertStock(cart: CartResponse) {
  if (!cart.items.length)
    throw new CommerceError('Seu carrinho está vazio.', 409, 'EMPTY_CART')
  for (const item of cart.items) {
    if (item.quantity > item.nft.availability)
      throw new CommerceError(
        `Estoque insuficiente para ${item.nft.name}. Ajuste a quantidade no carrinho.`,
        409,
        'INSUFFICIENT_STOCK',
      )
    if (item.edition !== item.nft.edition)
      throw new CommerceError(
        'Uma edição não está mais disponível. Revise o carrinho.',
        409,
        'EDITION_UNAVAILABLE',
      )
  }
  if (cart.coupon && cart.coupon.status !== 'valid')
    throw new CommerceError(cart.coupon.message, 422, 'COUPON_UNAVAILABLE')
}
