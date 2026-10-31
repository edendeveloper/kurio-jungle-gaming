import type { QueryClient } from '@tanstack/react-query'
import type { NftDetail } from '@/types/nft-detail'
import type { CatalogResponse } from '@/features/marketplace/types/catalog'
import type { PurchaseOrder } from '@/types/checkout'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/types/realtime'
import { withNftUpdate } from '@/types/realtime'
import { RealtimeVersionTracker, belongsToUser, canTransitionOrder } from './versioning'

export function applyNftUpdated(
  client: QueryClient,
  tracker: RealtimeVersionTracker,
  event: NftUpdatedEvent,
) {
  const detail = client.getQueryData<NftDetail>(['nft', event.nftId])
  const catalogRows = client
    .getQueriesData<CatalogResponse>({ queryKey: ['nfts'] })
    .flatMap(([, data]) => data?.items ?? [])
  const knownVersion = Math.max(
    detail?.version ?? 0,
    ...catalogRows
      .filter((nft) => nft.id === event.nftId)
      .map((nft) => nft.version ?? 0),
  )
  if (
    !tracker.accept(
      event.eventId,
      `nft:${event.nftId}`,
      event.version,
      knownVersion,
    )
  )
    return false

  if (detail)
    client.setQueryData<NftDetail>(['nft', event.nftId], (old) =>
      old ? withNftUpdate(old, event) : old,
    )
  // Price and stock affect filtering, sorting, cart totals and existing quotes.
  // Re-read the authoritative mock REST state instead of reshuffling pages locally.
  void client.invalidateQueries({ queryKey: ['nfts'] })
  void client.invalidateQueries({ queryKey: ['nft-related'] })
  void client.invalidateQueries({ queryKey: ['cart'] })
  void client.invalidateQueries({ queryKey: ['checkout-quote'] })
  return true
}

function eventOrderStatus(event: OrderUpdatedEvent): PurchaseOrder['status'] {
  return event.status === 'pending' ? 'processing' : event.status
}

export function applyOrderUpdated(
  client: QueryClient,
  tracker: RealtimeVersionTracker,
  event: OrderUpdatedEvent,
  currentUserId?: string,
) {
  if (!belongsToUser(event.ownerUserId, currentUserId)) return false
  const key = `order:${event.orderId}`
  const candidates = client.getQueriesData<PurchaseOrder | { order: PurchaseOrder | null }>({
    predicate: (query) =>
      ['order', 'order-attempt', 'active-order'].includes(String(query.queryKey[0])),
  })
  const cached = candidates.flatMap(([, value]) =>
    value && 'order' in value ? (value.order ? [value.order] : []) : value ? [value] : [],
  ).find((order) => order.id === event.orderId && order.userId === currentUserId)
  const nextStatus = eventOrderStatus(event)
  if (!canTransitionOrder(cached?.status, nextStatus)) return false
  if (
    !tracker.accept(
      event.eventId,
      key,
      event.version,
      cached?.version ?? 0,
    )
  )
    return false

  for (const [queryKey, value] of candidates) {
    if (value && 'order' in value) {
      if (value.order?.id !== event.orderId || value.order.userId !== currentUserId) continue
      client.setQueryData(queryKey, {
        order: {
          ...value.order,
          status: nextStatus,
          version: event.version,
          ...(nextStatus === 'confirmed' ? { confirmedAt: event.updatedAt } : {}),
        },
      })
    } else if (value?.id === event.orderId && value.userId === currentUserId) {
      client.setQueryData(queryKey, {
        ...value,
        status: nextStatus,
        version: event.version,
        ...(nextStatus === 'confirmed' ? { confirmedAt: event.updatedAt } : {}),
      })
    }
  }
  void client.invalidateQueries({ queryKey: ['order'] })
  void client.invalidateQueries({ queryKey: ['order-attempt'] })
  void client.invalidateQueries({ queryKey: ['active-order'] })
  return true
}
