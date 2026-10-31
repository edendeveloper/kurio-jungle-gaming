import { http, HttpResponse } from 'msw'
import { env } from '@/lib/env'
import { calculateTotals } from '@/lib/money'
import { validateCheckout } from '@/features/checkout/validation'
import type {
  CheckoutPayload,
  CheckoutQuote,
  PurchaseOrder,
} from '@/types/checkout'
import { getNftRecords } from '../data/nft-detail'
import { cartOwner, readAccounts } from '../store/accounts'
import {
  cartResponse,
  assertStock,
  CommerceError,
  requireUser,
} from '../store/commerce'
import {
  commerceTransaction,
  readCommerce,
  writeCommerce,
} from '../store/persistence'
import { currentSession } from '../store/session'
import { emitMockEvent } from './realtime'

const base = env.apiBaseUrl.replace(/\/$/, '')
function respondError(error: unknown) {
  if (error instanceof CommerceError)
    return HttpResponse.json(
      { message: error.message, code: error.code },
      { status: error.status },
    )
  throw error
}
async function run(action: () => Response) {
  try {
    return await commerceTransaction(action)
  } catch (error) {
    return respondError(error)
  }
}
const bodyOf = async (request: Request) =>
  (await request.json().catch(() => null)) as Record<string, unknown> | null
function cartFailure() {
  if (localStorage.getItem('kurio:cart-scenario') === 'error')
    throw new CommerceError(
      'Não foi possível atualizar o carrinho. Tente novamente.',
      503,
      'CART_UNAVAILABLE',
    )
}
function resolveOrder(order: PurchaseOrder): PurchaseOrder {
  if (order.status !== 'processing' || Date.now() < order.resolveAt)
    return order
  const state = readCommerce(order.userId)
  let reason = '',
    code = ''
  const records = getNftRecords()
  for (const item of order.items) {
    const current = records.find((nft) => nft.id === item.nftId)
    if (!current || current.availability < item.quantity) {
      reason = 'O estoque mudou durante o processamento. Revise o carrinho.'
      code = 'INSUFFICIENT_STOCK'
      break
    }
    if (current.priceEth !== item.nft.priceEth) {
      reason = 'O preço mudou durante o processamento. Revise a cotação.'
      code = 'PRICE_CHANGED'
      break
    }
  }
  if (
    order.coupon &&
    localStorage.getItem('kurio:coupon-scenario') === 'expired'
  ) {
    reason = 'O cupom expirou antes da confirmação.'
    code = 'COUPON_UNAVAILABLE'
  }
  const recalculated = calculateTotals(
    order.items.map((item) => ({ ...item.nft, quantity: item.quantity })),
    order.coupon?.code,
  )
  if (recalculated.coupon && recalculated.coupon.status !== 'valid') {
    reason = recalculated.coupon.message
    code = 'COUPON_UNAVAILABLE'
  }
  if (JSON.stringify(recalculated.totals) !== JSON.stringify(order.totals)) {
    reason = 'Os valores do pedido mudaram. Revise a cotação antes de comprar.'
    code = 'PRICE_CHANGED'
  }
  if (order.outcome === 'rejected') {
    reason =
      'A carteira recusou a confirmação simulada. Seus itens foram preservados.'
    code = 'PAYMENT_DECLINED'
  }
  if (reason) {
    order.status = 'rejected'
    order.reason = reason
    order.errorCode = code
  } else {
    order.status = 'confirmed'
    order.confirmedAt = new Date().toISOString()
    order.simulatedTransactionId = `demo-${order.id}`
    for (const purchased of order.items) {
      const row = state.items.find(
        (item) =>
          item.nftId === purchased.nftId && item.edition === purchased.edition,
      )
      if (row) row.quantity -= purchased.quantity
    }
    state.items = state.items.filter((item) => item.quantity > 0)
    if (!state.items.length) state.couponCode = null
  }
  order.version = (order.version ?? 1) + 1
  state.orders[order.id] = order
  writeCommerce(state) // receipt, stock ledger and cart change are one atomic storage write
  emitMockEvent('order.updated', {
    eventId: `order-${order.id}-${order.version}`,
    orderId: order.id,
    ownerUserId: order.userId,
    version: order.version,
    status: order.status,
    updatedAt: order.confirmedAt ?? new Date().toISOString(),
  })
  return order
}

export const commerceHandlers = [
  http.get(`${base}/cart`, ({ request }) =>
    run(() => {
      if (localStorage.getItem('kurio:cart-scenario') === 'html')
        return new Response('<!doctype html><html></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      cartFailure()
      return HttpResponse.json(cartResponse(readCommerce(cartOwner(request))))
    }),
  ),
  http.post(`${base}/cart/items`, async ({ request }) => {
    const body = await bodyOf(request)
    return run(() => {
      cartFailure()
      if (
        !body ||
        typeof body.nftId !== 'string' ||
        !Number.isSafeInteger(body.quantity) ||
        (body.quantity as number) < 1 ||
        !Number.isSafeInteger(body.edition)
      )
        throw new CommerceError(
          'Item ou quantidade inválida.',
          400,
          'INVALID_CART_ITEM',
        )
      const nft = getNftRecords().find((nft) => nft.id === body.nftId)
      if (!nft)
        throw new CommerceError('NFT não encontrado.', 404, 'NFT_NOT_FOUND')
      if (body.edition !== nft.edition)
        throw new CommerceError(
          'Edição indisponível.',
          409,
          'EDITION_UNAVAILABLE',
        )
      const state = readCommerce(cartOwner(request)),
        existing = state.items.find(
          (item) => item.nftId === nft.id && item.edition === nft.edition,
        )
      const quantity = (existing?.quantity ?? 0) + (body.quantity as number)
      if (quantity > nft.availability)
        throw new CommerceError(
          'A quantidade solicitada excede a disponibilidade atual.',
          409,
          'INSUFFICIENT_STOCK',
        )
      if (existing) existing.quantity = quantity
      else state.items.push({ nftId: nft.id, edition: nft.edition, quantity })
      writeCommerce(state)
      return HttpResponse.json(cartResponse(state), { status: 201 })
    })
  }),
  http.patch(`${base}/cart/items/:id/:edition`, async ({ request, params }) => {
    const body = await bodyOf(request)
    return run(() => {
      cartFailure()
      if (
        !Number.isSafeInteger(body?.quantity) ||
        (body!.quantity as number) < 1
      )
        throw new CommerceError(
          'Quantidade deve ser um inteiro positivo.',
          400,
          'INVALID_QUANTITY',
        )
      const state = readCommerce(cartOwner(request)),
        row = state.items.find(
          (item) =>
            item.nftId === params.id && String(item.edition) === params.edition,
        )
      if (!row)
        throw new CommerceError(
          'Item não encontrado no carrinho.',
          404,
          'CART_ITEM_NOT_FOUND',
        )
      const nft = getNftRecords().find((nft) => nft.id === row.nftId)
      if (!nft || (body!.quantity as number) > nft.availability)
        throw new CommerceError(
          'Quantidade acima da disponibilidade atual.',
          409,
          'INSUFFICIENT_STOCK',
        )
      row.quantity = body!.quantity as number
      writeCommerce(state)
      return HttpResponse.json(cartResponse(state))
    })
  }),
  http.delete(`${base}/cart/items/:id/:edition`, ({ params, request }) =>
    run(() => {
      cartFailure()
      const state = readCommerce(cartOwner(request))
      state.items = state.items.filter(
        (item) =>
          !(
            item.nftId === params.id && String(item.edition) === params.edition
          ),
      )
      if (!state.items.length) state.couponCode = null
      writeCommerce(state)
      return HttpResponse.json(cartResponse(state))
    }),
  ),
  http.post(`${base}/cart/coupon`, async ({ request }) => {
    const body = await bodyOf(request)
    return run(() => {
      cartFailure()
      const state = readCommerce(cartOwner(request))
      if (typeof body?.code !== 'string' || body.code.length > 32)
        throw new CommerceError(
          'Informe um código promocional válido.',
          400,
          'INVALID_COUPON',
        )
      if (!state.items.length)
        throw new CommerceError(
          'Adicione itens antes de aplicar o cupom.',
          409,
          'EMPTY_CART',
        )
      const candidate = cartResponse({
        ...state,
        couponCode: body.code.trim().toUpperCase(),
      })
      if (!candidate.coupon || candidate.coupon.status !== 'valid')
        throw new CommerceError(
          candidate.coupon?.message ?? 'Código inválido.',
          422,
          `COUPON_${candidate.coupon?.status.toUpperCase() ?? 'INVALID'}`,
        )
      state.couponCode = candidate.coupon.code
      writeCommerce(state)
      return HttpResponse.json(cartResponse(state))
    })
  }),
  http.delete(`${base}/cart/coupon`, ({ request }) =>
    run(() => {
      cartFailure()
      const state = readCommerce(cartOwner(request))
      state.couponCode = null
      writeCommerce(state)
      return HttpResponse.json(cartResponse(state))
    }),
  ),
  http.post(`${base}/checkout/quote`, async ({ request }) => {
    const body = await bodyOf(request)
    return run(() => {
      const userId = requireUser(currentSession(request).user?.id),
        state = readCommerce(cartOwner(request)),
        cart = cartResponse(state)
      assertStock(cart)
      if (!['ethereum', 'polygon', 'solana'].includes(String(body?.network)))
        throw new CommerceError(
          'Selecione uma rede válida.',
          422,
          'INVALID_NETWORK',
        )
      if (cart.items.some((item) => item.nft.network !== body?.network))
        throw new CommerceError(
          'A rede da carteira deve corresponder à rede de todos os NFTs. Ajuste o carrinho para comprar em uma rede por vez.',
          422,
          'NETWORK_MISMATCH',
        )
      const quote: CheckoutQuote = {
        id: crypto.randomUUID(),
        userId,
        cartVersion: cart.version,
        items: cart.items,
        totals: cart.totals,
        coupon: cart.coupon,
        network: body!.network as CheckoutQuote['network'],
        expiresAt: Date.now() + 120000,
      }
      state.quotes = Object.fromEntries(
        Object.entries(state.quotes).filter(
          ([, quote]) => quote.expiresAt > Date.now(),
        ),
      )
      state.quotes[quote.id] = quote
      writeCommerce(state)
      return HttpResponse.json(quote)
    })
  }),
  http.post(`${base}/orders`, async ({ request }) => {
    const raw = await bodyOf(request),
      key = request.headers.get('Idempotency-Key')
    let lost = false
    const result = await run(() => {
      const userId = requireUser(currentSession(request).user?.id)
      if (!key || !/^[a-zA-Z0-9-]{8,100}$/.test(key))
        throw new CommerceError(
          'Informe a chave de idempotência.',
          400,
          'IDEMPOTENCY_REQUIRED',
        )
      const validated = validateCheckout(raw)
      if (!validated.data)
        throw new CommerceError(
          Object.values(validated.errors).join(' '),
          422,
          'INVALID_CHECKOUT',
        )
      const body: CheckoutPayload = validated.data,
        fingerprint = JSON.stringify(body),
        state = readCommerce(cartOwner(request))
      const previous = Object.values(state.orders).find(
        (order) => order.userId === userId && order.idempotencyKey === key,
      )
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new CommerceError(
            'Esta chave já foi usada com outros dados.',
            409,
            'IDEMPOTENCY_CONFLICT',
          )
        return HttpResponse.json(resolveOrder(previous))
      }
      if (
        Object.values(state.orders).some(
          (order) => order.userId === userId && order.status === 'processing',
        )
      )
        throw new CommerceError(
          'Já existe uma compra em processamento. Retome o pedido ativo.',
          409,
          'ORDER_IN_PROGRESS',
        )
      const quote = state.quotes[body.quoteId]
      if (!quote || quote.userId !== userId || quote.expiresAt <= Date.now())
        throw new CommerceError(
          'A cotação expirou. Atualize e confirme os valores novamente.',
          409,
          'QUOTE_EXPIRED',
        )
      const cart = cartResponse(state)
      assertStock(cart)
      if (quote.cartVersion !== cart.version)
        throw new CommerceError(
          'Preço, estoque ou carrinho alterado. Revise a nova cotação antes de confirmar.',
          409,
          'QUOTE_CHANGED',
        )
      if (body.wallet.network !== quote.network)
        throw new CommerceError(
          'Carteira e cotação usam redes diferentes.',
          422,
          'WALLET_NETWORK_MISMATCH',
        )
      if (body.wallet.savedWalletId) {
        const saved = readAccounts().users[userId].wallets.find(
          (wallet) => wallet.id === body.wallet.savedWalletId,
        )
        if (
          !saved ||
          saved.address !== body.wallet.address ||
          saved.network !== body.wallet.network ||
          saved.provider !== body.wallet.provider
        )
          throw new CommerceError(
            'Os dados não correspondem à carteira salva selecionada.',
            422,
            'WALLET_MISMATCH',
          )
      }
      const scenario = localStorage.getItem('kurio:checkout-scenario')
      if (scenario === 'error')
        throw new CommerceError(
          'Falha transitória ao confirmar. O carrinho foi preservado.',
          503,
          'ORDER_UNAVAILABLE',
        )
      const order: PurchaseOrder = {
        id: `KUR-${crypto.randomUUID()}`,
        userId,
        idempotencyKey: key,
        fingerprint,
        status: 'processing',
        createdAt: new Date().toISOString(),
        items: structuredClone(quote.items),
        totals: { ...cart.totals },
        coupon: cart.coupon,
        collector: body.collector,
        wallet: body.wallet,
        resolveAt: Date.now() + (scenario === 'slow' ? 3000 : 700),
        outcome: scenario === 'declined' ? 'rejected' : 'confirmed',
        version: 1,
      }
      state.orders[order.id] = order
      writeCommerce(state)
      emitMockEvent('order.updated', {
        eventId: `order-${order.id}-1`,
        orderId: order.id,
        ownerUserId: order.userId,
        version: 1,
        status: 'pending',
        updatedAt: order.createdAt,
      })
      lost = scenario === 'response-lost'
      return HttpResponse.json(order, { status: 202 })
    })
    return lost ? HttpResponse.error() : result
  }),
  http.get(`${base}/orders/active`, ({ request }) =>
    run(() => {
      const userId = requireUser(currentSession(request).user?.id)
      const order = Object.values(readCommerce(cartOwner(request)).orders).find(
        (order) => order.userId === userId && order.status === 'processing',
      )
      return HttpResponse.json({ order: order ? resolveOrder(order) : null })
    }),
  ),
  http.get(`${base}/orders/attempt/:key`, ({ params, request }) =>
    run(() => {
      const userId = requireUser(currentSession(request).user?.id)
      const order = Object.values(readCommerce(cartOwner(request)).orders).find(
        (order) =>
          order.userId === userId && order.idempotencyKey === params.key,
      )
      if (!order)
        throw new CommerceError(
          'Tentativa ainda não recebida. Você pode reenviar com segurança.',
          404,
          'ATTEMPT_NOT_FOUND',
        )
      return HttpResponse.json(resolveOrder(order))
    }),
  ),
  http.get(`${base}/orders/:id`, ({ params, request }) =>
    run(() => {
      const userId = requireUser(currentSession(request).user?.id),
        order = readCommerce(cartOwner(request)).orders[String(params.id)]
      if (!order || order.userId !== userId)
        throw new CommerceError(
          'Pedido não encontrado para esta sessão.',
          404,
          'ORDER_NOT_FOUND',
        )
      return HttpResponse.json(resolveOrder(order))
    }),
  ),
]
