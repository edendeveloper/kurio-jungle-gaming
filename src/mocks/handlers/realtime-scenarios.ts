import { http, HttpResponse } from 'msw'
import { env } from '@/lib/env'
import { decimalEth } from '@/lib/money'
import { getNftRecords } from '../data/nft-detail'
import { resetRealtimeState, updateMockNft } from '../store/realtime'
import { disconnectMockSockets, emitMockEvent } from './realtime'

const base = `${env.apiBaseUrl.replace(/\/$/, '')}/__mock/realtime`
export const realtimeScenarioHandlers = [
  http.post(`${base}/nfts/:id`, async ({ params, request }) => {
    const raw: unknown = await request.json().catch(() => null)
    if (typeof raw !== 'object' || raw === null)
      return HttpResponse.json({ code: 'INVALID_SCENARIO' }, { status: 400 })
    const body = raw as Record<string, unknown>
    if (
      (body.priceEth !== undefined && decimalEth(body.priceEth) === undefined) ||
      (body.availableQuantity !== undefined &&
        (!Number.isSafeInteger(body.availableQuantity) ||
          (body.availableQuantity as number) < 0))
    )
      return HttpResponse.json({ code: 'INVALID_SCENARIO' }, { status: 400 })
    const event = updateMockNft(String(params.id), {
      ...(typeof body.priceEth === 'string' ? { priceEth: decimalEth(body.priceEth)! } : {}),
      ...(typeof body.availableQuantity === 'number'
        ? { availableQuantity: body.availableQuantity }
        : {}),
    })
    if (!event)
      return HttpResponse.json({ code: 'NFT_NOT_FOUND' }, { status: 404 })
    emitMockEvent('nft.updated', event)
    return HttpResponse.json({ event })
  }),
  http.post(`${base}/events/nft`, async ({ request }) => {
    const raw: unknown = await request.json().catch(() => null)
    if (typeof raw !== 'object' || raw === null)
      return HttpResponse.json({ code: 'INVALID_EVENT' }, { status: 400 })
    const body = raw as Record<string, unknown>
    const nft = getNftRecords().find((item) => item.id === body.nftId)
    if (!nft)
      return HttpResponse.json({ code: 'NFT_NOT_FOUND' }, { status: 404 })
    const currentVersion = nft.version ?? 1
    const version = body.version === 'old' ? Math.max(1, currentVersion - 1) : currentVersion
    const event = {
      eventId: typeof body.eventId === 'string' ? body.eventId : `test-${crypto.randomUUID()}`,
      nftId: nft.id,
      version,
      priceEth: typeof body.priceEth === 'string' ? body.priceEth : nft.priceEth,
      availableQuantity: nft.availability,
      updatedAt: new Date().toISOString(),
    }
    emitMockEvent('nft.updated', event)
    if (body.duplicate === true) emitMockEvent('nft.updated', event)
    return HttpResponse.json({ event, duplicated: body.duplicate === true })
  }),
  http.post(`${base}/reset`, () => {
    resetRealtimeState()
    return HttpResponse.json({ reset: true })
  }),
  http.post(`${base}/disconnect`, () => {
    disconnectMockSockets()
    return HttpResponse.json({ disconnected: true })
  }),
]
