import { lineSubtotal } from '../../lib/money.ts'

export function clampQuantity(requested: number, available: number): number {
  return Math.max(
    1,
    Math.min(
      Number.isSafeInteger(requested) ? requested : 1,
      Math.max(1, available),
    ),
  )
}
export const totalEth = lineSubtotal
