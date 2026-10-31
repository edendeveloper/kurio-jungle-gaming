import type { ReactNode } from 'react'
import type { MoneyTotals, CouponResult } from '@/lib/money'

export function FinancialSummary({
  totals,
  coupon,
  children,
  title = 'Resumo do pedido',
}: {
  totals: MoneyTotals
  coupon?: CouponResult | null
  children?: ReactNode
  title?: string
}) {
  return (
    <section className="financial-summary" aria-label={title}>
      <h2>{title}</h2>
      {coupon && (
        <p
          className={
            coupon.status === 'valid' ? 'coupon-note' : 'commerce-error'
          }
        >
          {coupon.code} · {coupon.message}
        </p>
      )}
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd data-testid="subtotal">{totals.subtotalEth} ETH</dd>
        </div>
        <div>
          <dt>Desconto promocional</dt>
          <dd data-testid="discount">−{totals.discountEth} ETH</dd>
        </div>
        <div>
          <dt>Taxa estimada de rede</dt>
          <dd data-testid="network-fee">{totals.networkFeeEth} ETH</dd>
        </div>
        <div className="financial-total">
          <dt>Total</dt>
          <dd data-testid="total">{totals.totalEth} ETH</dd>
        </div>
      </dl>
      <p className="commerce-hint">
        Valores e pagamento de demonstração. Nenhuma cobrança real.
      </p>
      {children}
    </section>
  )
}
