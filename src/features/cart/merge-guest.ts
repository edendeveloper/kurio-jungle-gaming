interface Row {
  nftId: string
  edition: number
  quantity: number
}
export function mergeGuestCart(
  guest: readonly Row[],
  owned: readonly Row[],
  inventory: readonly { id: string; edition: number; availability: number }[],
) {
  const items = owned.map((row) => ({ ...row })),
    guestItems: Row[] = [],
    conflicts: { nftId: string; remaining: number }[] = []
  let addedQuantity = 0,
    remainingGuestQuantity = 0
  for (const row of guest) {
    const target = items.find(
        (item) => item.nftId === row.nftId && item.edition === row.edition,
      ),
      nft = inventory.find(
        (item) => item.id === row.nftId && item.edition === row.edition,
      )
    const accepted = Math.min(
      row.quantity,
      Math.max(0, (nft?.availability ?? 0) - (target?.quantity ?? 0)),
    )
    if (accepted) {
      if (target) target.quantity += accepted
      else items.push({ ...row, quantity: accepted })
      addedQuantity += accepted
    }
    const remaining = row.quantity - accepted
    if (remaining) {
      guestItems.push({ ...row, quantity: remaining })
      remainingGuestQuantity += remaining
      conflicts.push({ nftId: row.nftId, remaining })
    }
  }
  return { items, guestItems, addedQuantity, remainingGuestQuantity, conflicts }
}
