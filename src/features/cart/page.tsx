import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { FinancialSummary } from '@/features/checkout/components/financial-summary'
import { useCart, useUpdateCart } from './api'
import { CartRecommendations } from './recommendations'
import { nftImageSrcSet } from '@/lib/nft-image'
import '@/features/checkout/styles.css'
import './styles.css'

export function CartPage() {
  const cart = useCart(),
    update = useUpdateCart()
  const [code, setCode] = useState('')
  const items = cart.data?.items ?? []
  return (
    <section className="commerce-page cart-page">
      <Breadcrumbs
        items={[
          { label: 'Início', to: '/' },
          { label: 'Mercado', to: '/marketplace' },
          { label: 'Carrinho' },
        ]}
      />
      <h1>Carrinho</h1>
      {cart.isPending ? (
        <div
          className="commerce-loading"
          aria-label="Carregando carrinho"
          aria-busy="true"
        >
          Carregando carrinho…
        </div>
      ) : cart.isError ? (
        <div className="commerce-state" role="alert">
          <p>Não foi possível carregar o carrinho.</p>
          <PrimaryButton onClick={() => void cart.refetch()}>
            Tentar novamente
          </PrimaryButton>
        </div>
      ) : !items.length ? (
        <div className="commerce-state">
          <h2>Seu carrinho está vazio.</h2>
          <p>Explore a coleção para escolher seu próximo NFT.</p>
          <PrimaryButton asChild>
            <Link to="/marketplace">Continuar explorando</Link>
          </PrimaryButton>
        </div>
      ) : (
        <>
          {update.isError && (
            <p role="alert" className="commerce-error">
              {update.error.message}
            </p>
          )}
          <div className="commerce-columns">
            <div>
              <div className="cart-grid-heading" aria-hidden="true">
                <span>NFT</span>
                <span>Preço unitário</span>
                <span>Quantidade</span>
                <span>Subtotal</span>
                <span />
              </div>
              <ul className="cart-lines">
                {items.map((item) => (
                  <li
                    className="cart-line"
                    key={`${item.nftId}:${item.edition}`}
                    data-testid="cart-item"
                  >
                    <div className="cart-art-info">
                      <Link to="/nft/$nftId" params={{ nftId: item.nftId }}>
                        <img
                          src={item.nft.imageUrl}
                          srcSet={nftImageSrcSet(item.nft.imageUrl)}
                          sizes="100px"
                          alt={item.nft.imageAlt}
                          width="100"
                          height="100"
                        />
                      </Link>
                      <div>
                        <h2>
                          <Link to="/nft/$nftId" params={{ nftId: item.nftId }}>
                            {item.nft.name}
                          </Link>
                        </h2>
                        <p>Token #{item.nft.tokenId}</p>
                        <p>
                          Edição: {item.edition}/{item.nft.totalEditions}
                        </p>
                        <p className="commerce-hint">
                          Rede: {item.nft.network} · {item.nft.availability}{' '}
                          disponíveis
                        </p>
                      </div>
                    </div>
                    <p className="cart-unit-price">
                      <span>Preço unitário: </span>
                      {item.nft.priceEth} ETH
                    </p>
                    <div className="cart-quantity">
                      <p>Quantidade: {item.quantity}</p>
                      <div>
                        <button
                          type="button"
                          aria-label={`Diminuir quantidade de ${item.nft.name}`}
                          disabled={
                            update.isPending ||
                            item.quantity <= 1 ||
                            item.nft.availability === 0
                          }
                          onClick={() =>
                            update.mutate({
                              type: 'quantity',
                              nftId: item.nftId,
                              edition: item.edition,
                              quantity: Math.min(
                                item.quantity - 1,
                                item.nft.availability,
                              ),
                            })
                          }
                        >
                          <Minus size={18} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Aumentar quantidade de ${item.nft.name}`}
                          disabled={
                            update.isPending ||
                            item.quantity >= item.nft.availability
                          }
                          onClick={() =>
                            update.mutate({
                              type: 'quantity',
                              nftId: item.nftId,
                              edition: item.edition,
                              quantity: item.quantity + 1,
                            })
                          }
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      {item.quantity > item.nft.availability && (
                        <p className="commerce-error">
                          Ajuste a quantidade ao estoque atual.
                        </p>
                      )}
                    </div>
                    <p className="cart-item-subtotal">
                      <span>Subtotal: </span>
                      {item.subtotalEth} ETH
                    </p>
                    <button
                      type="button"
                      className="remove-cart-item"
                      aria-label={`Remover ${item.nft.name}`}
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({
                          type: 'remove',
                          nftId: item.nftId,
                          edition: item.edition,
                        })
                      }
                    >
                      <Trash2 size={20} />
                    </button>
                  </li>
                ))}
              </ul>
              <Link className="continue-exploring" to="/marketplace">
                ← Continuar explorando
              </Link>
            </div>
            <aside>
              <form
                className="coupon-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  update.mutate(
                    { type: 'coupon', code },
                    { onSuccess: () => setCode('') },
                  )
                }}
              >
                <label htmlFor="promo-code">Código promocional</label>
                <div>
                  <input
                    id="promo-code"
                    placeholder="Digite o código promocional…"
                    value={code}
                    maxLength={32}
                    onChange={(event) => setCode(event.target.value)}
                  />
                  <PrimaryButton
                    type="submit"
                    disabled={update.isPending || !code.trim()}
                  >
                    Aplicar
                  </PrimaryButton>
                </div>
                {cart.data.coupon && (
                  <SecondaryButton
                    disabled={update.isPending}
                    onClick={() => update.mutate({ type: 'clear-coupon' })}
                  >
                    Remover cupom {cart.data.coupon.code}
                  </SecondaryButton>
                )}
              </form>
              <FinancialSummary
                totals={cart.data.totals}
                coupon={cart.data.coupon}
              >
                <PrimaryButton asChild className="commerce-primary-action">
                  <Link to="/checkout">Conectar e finalizar</Link>
                </PrimaryButton>
              </FinancialSummary>
            </aside>
          </div>
        </>
      )}
      <CartRecommendations />
    </section>
  )
}
