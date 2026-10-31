import type { PurchaseOrder } from '../../types/checkout.ts'

export class RealtimeVersionTracker {
  private readonly eventIds = new Set<string>()
  private readonly versions = new Map<string, number>()

  accept(eventId: string, resource: string, version: number, knownVersion = 0) {
    if (this.eventIds.has(eventId)) return false
    this.eventIds.add(eventId)
    if (this.eventIds.size > 1000) {
      const oldest = this.eventIds.values().next().value
      if (oldest) this.eventIds.delete(oldest)
    }
    const current = Math.max(this.versions.get(resource) ?? 0, knownVersion)
    if (!Number.isSafeInteger(version) || version <= current) return false
    this.versions.set(resource, version)
    return true
  }

  version(resource: string) {
    return this.versions.get(resource) ?? 0
  }

  clear() {
    this.eventIds.clear()
    this.versions.clear()
  }
}

export function canTransitionOrder(
  current: PurchaseOrder['status'] | undefined,
  next: PurchaseOrder['status'],
) {
  if (current === 'confirmed' || current === 'rejected') return current === next
  return true
}

export function belongsToUser(eventOwnerId: string, currentUserId?: string) {
  return Boolean(currentUserId && eventOwnerId === currentUserId)
}
