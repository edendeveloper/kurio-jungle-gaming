export function decimalEth(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{1,9}(\.\d{1,18})?$/.test(value.trim()))
    return undefined
  const [whole, fraction = ''] = value.trim().split('.')
  const integer = whole.replace(/^0+(?=\d)/, '')
  const decimals = fraction.replace(/0+$/, '')
  return decimals ? `${integer}.${decimals}` : integer
}
export function ethUnits(value: string): bigint {
  const normalized = decimalEth(value)
  if (normalized === undefined) throw new Error('Valor ETH inválido')
  const [whole, fraction = ''] = normalized.split('.')
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'))
}
export function formatEth(units: bigint): string {
  if (units < 0n) throw new Error('Valor ETH negativo')
  const whole = units / 10n ** 18n
  const fraction = (units % 10n ** 18n)
    .toString()
    .padStart(18, '0')
    .replace(/0+$/, '')
  return `${whole}${fraction ? `.${fraction}` : ''}`
}
export function lineSubtotal(price: string, quantity: number): string {
  if (!Number.isSafeInteger(quantity) || quantity < 0)
    throw new Error('Quantidade inválida')
  return formatEth(ethUnits(price) * BigInt(quantity))
}
export function discountPercent(currentPrice: string, originalPrice: string) {
  const current = ethUnits(currentPrice)
  const original = ethUnits(originalPrice)
  if (original <= current || original === 0n) return undefined
  const tenths = ((original - current) * 1_000n + original / 2n) / original
  const whole = tenths / 10n
  const fractional = tenths % 10n
  return fractional === 0n ? `${whole}%` : `${whole},${fractional}%`
}
export interface MoneyLine {
  priceEth: string
  quantity: number
  network: string
}
export interface MoneyTotals {
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
}
export interface CouponResult {
  code: string
  status: 'valid' | 'invalid' | 'expired' | 'incompatible'
  message: string
}
export function calculateTotals(
  lines: readonly MoneyLine[],
  rawCoupon?: string | null,
): { totals: MoneyTotals; coupon: CouponResult | null } {
  const subtotal = lines.reduce(
    (sum, line) => sum + ethUnits(lineSubtotal(line.priceEth, line.quantity)),
    0n,
  )
  const fees: Record<string, string> = {
    ethereum: '0.016',
    polygon: '0.002',
    solana: '0.001',
  }
  const fee = [...new Set(lines.map((line) => line.network))].reduce(
    (sum, network) => sum + ethUnits(fees[network] ?? '0'),
    0n,
  )
  const code = rawCoupon?.trim().toUpperCase()
  let discount = 0n,
    coupon: CouponResult | null = null
  if (code) {
    if (code === 'EXPIRED')
      coupon = { code, status: 'expired', message: 'Este cupom expirou.' }
    else if (
      code === 'POLYGON20' &&
      lines.some((line) => line.network !== 'polygon')
    )
      coupon = {
        code,
        status: 'incompatible',
        message: 'Este cupom aceita somente NFTs da rede Polygon.',
      }
    else if (!['KURIO10', 'LAUNCH5', 'POLYGON20'].includes(code))
      coupon = {
        code,
        status: 'invalid',
        message: 'Código promocional inválido.',
      }
    else {
      coupon = {
        code,
        status: 'valid',
        message:
          code === 'LAUNCH5'
            ? 'Desconto de até 0.05 ETH.'
            : `Desconto de ${code === 'POLYGON20' ? '20' : '10'}% sobre os itens.`,
      }
      discount =
        code === 'LAUNCH5'
          ? ethUnits('0.05')
          : (subtotal * (code === 'POLYGON20' ? 20n : 10n)) / 100n
      if (discount > subtotal) discount = subtotal
    }
  }
  return {
    totals: {
      subtotalEth: formatEth(subtotal),
      discountEth: formatEth(discount),
      networkFeeEth: formatEth(fee),
      totalEth: formatEth(subtotal - discount + fee),
    },
    coupon,
  }
}
