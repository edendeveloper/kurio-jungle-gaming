import type { Nft } from './nft.ts'

export interface NftUpdatedEvent {
  eventId: string
  nftId: string
  version: number
  priceEth: string
  availableQuantity: number
  updatedAt: string
}

export type RealtimeOrderStatus = 'pending' | 'confirmed' | 'rejected'
export interface OrderUpdatedEvent {
  eventId: string
  orderId: string
  ownerUserId: string
  version: number
  status: RealtimeOrderStatus
  updatedAt: string
}

export function parseNftUpdatedEvent(value: unknown): NftUpdatedEvent | null {
  if (typeof value !== 'object' || value === null) return null
  const event = value as Record<string, unknown>
  if (
    typeof event.eventId !== 'string' ||
    typeof event.nftId !== 'string' ||
    !Number.isSafeInteger(event.version) ||
    (event.version as number) < 1 ||
    typeof event.priceEth !== 'string' ||
    !/^\d{1,9}(\.\d{1,18})?$/.test(event.priceEth) ||
    !Number.isSafeInteger(event.availableQuantity) ||
    (event.availableQuantity as number) < 0 ||
    typeof event.updatedAt !== 'string' ||
    Number.isNaN(Date.parse(event.updatedAt))
  ) return null
  return event as unknown as NftUpdatedEvent
}

export function parseOrderUpdatedEvent(value: unknown): OrderUpdatedEvent | null {
  if (typeof value !== 'object' || value === null) return null
  const event = value as Record<string, unknown>
  if (
    typeof event.eventId !== 'string' ||
    typeof event.orderId !== 'string' ||
    typeof event.ownerUserId !== 'string' ||
    !Number.isSafeInteger(event.version) ||
    (event.version as number) < 1 ||
    !['pending', 'confirmed', 'rejected'].includes(String(event.status)) ||
    typeof event.updatedAt !== 'string' ||
    Number.isNaN(Date.parse(event.updatedAt))
  ) return null
  return event as unknown as OrderUpdatedEvent
}

export function withNftUpdate<T extends Nft>(nft: T, event: NftUpdatedEvent): T {
  return {
    ...nft,
    priceEth: event.priceEth,
    availability: event.availableQuantity,
    version: event.version,
  }
}
