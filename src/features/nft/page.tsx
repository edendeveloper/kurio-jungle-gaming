import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Heart, Minus, Plus, RefreshCw, ShoppingCart, Star } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PriceLabel } from '@/components/ui/price-label'
import { Tabs } from '@/components/ui/tabs'
import { NFTCard } from '@/components/marketplace/nft-card'
import { networks } from '@/features/marketplace/types/catalog'
import { useAddToCart } from '@/features/cart/api'
import { useNftFavorite } from '@/features/favorites/hooks'
import type { NftDetail } from '@/types/nft-detail'
import { NftGallery } from './components/gallery'
import { useNft, useRelatedNfts } from './hooks'
import { clampQuantity, totalEth } from './utils'
import './styles.css'
import { setPageMetadata } from '@/lib/seo'

function RelatedNfts({ id }: { id: string }) {
  const query = useRelatedNfts(id)
  return (
    <section className="nft-related" aria-labelledby="related-title">
      <h2 id="related-title">Mais desta coleção</h2>
      {query.isPending ? (
        <p aria-live="polite">Carregando coleção…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>Não foi possível carregar os itens relacionados.</p>
          <SecondaryButton onClick={() => void query.refetch()}>
            Tentar carregar coleção
          </SecondaryButton>
        </div>
      ) : query.data.items.length ? (
        <div className="nft-related-grid">
          {query.data.items.map((nft) => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </div>
      ) : (
        <p>Nenhum outro NFT disponível nesta coleção.</p>
      )}
    </section>
  )
}

function NftContent({
  nft,
  refresh,
  refreshing,
}: {
  nft: NftDetail
  refresh: () => void
  refreshing: boolean
}) {
  const [requested, setRequested] = useState(1)
  const [tab, setTab] = useState('details')
  const [favoriteNotice, setFavoriteNotice] = useState('')
  const [cartNotice, setCartNotice] = useState('')
  const quantity = clampQuantity(requested, nft.availability)
  if (quantity !== requested) setRequested(quantity)
  const favorite = useNftFavorite(nft.id)
  const cart = useAddToCart(),
    navigate = useNavigate()
  const soldOut = nft.availability === 0
  const network =
    networks.find(([id]) => id === nft.network)?.[1] ?? nft.network
  const token = /^\d+$/.test(nft.tokenId)
    ? nft.tokenId.padStart(4, '0')
    : nft.tokenId
  const favoriteDisabled =
    favorite.session.isPending ||
    favorite.mutation.isPending ||
    (!!favorite.session.data?.user &&
      (favorite.favorites.isPending || favorite.favorites.isError)) ||
    favorite.session.isError
  const favoriteButton = (
    <SecondaryButton
      className="nft-favorite-action"
      aria-label={
        favorite.isFavorite ? 'Remover dos favoritos' : 'Favoritar NFT'
      }
      aria-pressed={favorite.isFavorite}
      disabled={favoriteDisabled}
      onClick={() => {
        setFavoriteNotice('')
        if (!favorite.session.data?.user) {
          setFavoriteNotice('Entre na sua conta para favoritar.')
          void navigate({
            to: '/login',
            search: { returnTo: `/nft/${nft.id}`, reason: undefined },
          })
          return
        }
        favorite.mutation.mutate(!favorite.isFavorite)
      }}
    >
      <Heart
        size={20}
        fill={favorite.isFavorite ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
      <span>{favorite.isFavorite ? 'Favoritado' : 'Favoritar'}</span>
    </SecondaryButton>
  )
  const buy = () =>
    cart.mutate(
      { nftId: nft.id, edition: nft.edition, quantity },
      { onSuccess: () => void navigate({ to: '/cart' }) },
    )
  const addToCart = () => {
    setCartNotice('')
    cart.mutate(
      { nftId: nft.id, edition: nft.edition, quantity },
      {
        onSuccess: () =>
          setCartNotice(`${quantity} ${quantity === 1 ? 'item adicionado' : 'itens adicionados'} ao carrinho.`),
      },
    )
  }
  const quantityControl = (
    <div className="nft-quantity">
      <span>Qtd.</span>
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={quantity <= 1 || soldOut || cart.isPending}
        onClick={() => setRequested(quantity - 1)}
      >
        <Minus size={20} />
      </button>
      <output aria-label="Quantidade selecionada">{quantity}</output>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={quantity >= nft.availability || soldOut || cart.isPending}
        onClick={() => setRequested(quantity + 1)}
      >
        <Plus size={20} />
      </button>
    </div>
  )

  return (
    <article className="nft-detail-page">
      <div className="nft-breadcrumb">
        <Breadcrumbs
          items={[
            { label: 'Início', to: '/' },
            { label: 'Mercado', to: '/marketplace' },
            { label: nft.name },
          ]}
        />
      </div>
      <div className="nft-product">
        <NftGallery nft={nft} favoriteButton={favoriteButton} />
        <section className="nft-summary" aria-label="Informações do NFT">
          <div className="nft-title-block">
            <h1>{nft.name}</h1>
            <div className="nft-price-rating">
              <div className="nft-unit-price">
                <PriceLabel
                  amount={nft.priceEth}
                  previousAmount={nft.originalPriceEth}
                />
                <span className="sr-only">por NFT</span>
              </div>
              <button
                type="button"
                className="nft-rating"
                onClick={() => setTab('reviews')}
                aria-label={`${nft.rating} · ${nft.reviewCount} avaliações de colecionadores`}
              >
                <span className="nft-rating-stars" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((number) => (
                    <Star key={number} size={15} fill="currentColor" />
                  ))}
                </span>
                <span>
                  {nft.rating ?? '—'}{' '}
                  <span className="nft-desktop-review-label">
                    · {nft.reviewCount} avaliações de colecionadores
                  </span>
                  <span className="nft-mobile-review-label">
                    ({nft.reviewCount})
                  </span>
                </span>
              </button>
            </div>
          </div>
          <div className="nft-about">
            <h2>Sobre este NFT:</h2>
            <p>{nft.description}</p>
          </div>
          <div className="nft-edition">
            <h2>Edição:</h2>
            <div>
              <span className="nft-edition-chip">
                {nft.edition}/{nft.totalEditions}
              </span>
              <span className="nft-availability" aria-live="polite">
                {soldOut ? 'Esgotado' : `${nft.availability} disponíveis`}
              </span>
            </div>
          </div>
          <div className="nft-purchase">
            <div className="nft-purchase-top">
              {quantityControl}
              <div className="nft-selection-total">
                <span>Total</span>
                <strong>{totalEth(nft.priceEth, quantity)} ETH</strong>
              </div>
            </div>
            <div className="nft-purchase-actions">
              <PrimaryButton
                disabled={soldOut || cart.isPending || refreshing}
                onClick={buy}
              >
                {cart.isPending
                  ? 'Adicionando…'
                  : soldOut
                    ? 'Indisponível'
                    : 'Comprar NFT'}
              </PrimaryButton>
              <SecondaryButton
                className="nft-add-to-cart"
                disabled={soldOut || cart.isPending || refreshing}
                onClick={addToCart}
              >
                Adicionar ao carrinho
              </SecondaryButton>
              <div className="nft-desktop-favorite">{favoriteButton}</div>
              <Link
                to="/cart"
                className="nft-cart-shortcut"
                aria-label="Ver carrinho"
              >
                <ShoppingCart size={22} />
              </Link>
            </div>
            {cart.isError && (
              <p role="alert" className="nft-action-error">
                {cart.error.message}
              </p>
            )}
            {cartNotice && (
              <p className="nft-cart-notice" role="status">
                {cartNotice}{' '}
                <Link to="/cart">Ver carrinho</Link>
              </p>
            )}
          </div>
          <dl className="nft-identity">
            <div>
              <dt>ID do token:</dt>
              <dd>#{token}</dd>
            </div>
            <div>
              <dt>Coleção:</dt>
              <dd>{nft.collection}</dd>
            </div>
            <div>
              <dt>Atributos:</dt>
              <dd>{nft.attributes.join(', ')}</dd>
            </div>
          </dl>
          <div className="nft-data-note">
            <p>Demonstração · sem transações reais</p>
            <button type="button" onClick={refresh} disabled={refreshing}>
              <RefreshCw size={14} aria-hidden="true" />
              {refreshing ? 'Atualizando…' : 'Atualizar dados'}
            </button>
          </div>
          {favoriteNotice && (
            <p role="alert" className="nft-action-error">
              {favoriteNotice}
            </p>
          )}
          {favorite.mutation.isError && (
            <p role="alert" className="nft-action-error">
              {favorite.mutation.error.message} Seu favorito anterior foi
              preservado.
            </p>
          )}
          {(favorite.session.isError || favorite.favorites.isError) && (
            <div role="alert" className="nft-action-error">
              <p>Não foi possível consultar seus favoritos.</p>
              <SecondaryButton
                onClick={() => {
                  void favorite.session.refetch()
                  if (favorite.session.data?.user)
                    void favorite.favorites.refetch()
                }}
              >
                Tentar carregar favoritos
              </SecondaryButton>
            </div>
          )}
        </section>
      </div>
      <section className="nft-content-tabs" aria-label="Conteúdo do NFT">
        <Tabs
          label="Conteúdo do NFT"
          items={[
            { id: 'details', label: 'Detalhes do NFT' },
            {
              id: 'reviews',
              label: `Avaliações de colecionadores (${nft.reviewCount})`,
            },
          ]}
          activeId={tab}
          panelId="nft-content-panel"
          onChange={setTab}
        />
        <div
          id="nft-content-panel"
          role="tabpanel"
          aria-labelledby="nft-content-panel-tab"
          tabIndex={0}
        >
          {tab === 'details' ? (
            <div className="nft-description">
              <p>{nft.longDescription}</p>
              <dl>
                <div>
                  <dt>Rede:</dt>
                  <dd>
                    {network} · informação de demonstração, sem validação
                    on-chain.
                  </dd>
                </div>
                <div>
                  <dt>Contrato:</dt>
                  <dd>{nft.contract.description}</dd>
                </div>
                <div>
                  <dt>Direitos autorais:</dt>
                  <dd>{nft.rights}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="nft-reviews">
              {nft.reviews.length ? (
                <>
                  <p>
                    {nft.reviewCount} avaliações · média {nft.rating}/5 · dados
                    de demonstração
                  </p>
                  {nft.reviews.map((review) => (
                    <article key={review.id}>
                      <h2>{review.author}</h2>
                      <p aria-label={`Nota ${review.rating} de 5`}>
                        {'★'.repeat(review.rating)}
                        {'☆'.repeat(5 - review.rating)}
                      </p>
                      <p>{review.comment}</p>
                      <time dateTime={review.createdAt}>
                        {new Intl.DateTimeFormat('pt-BR', {
                          timeZone: 'UTC',
                        }).format(new Date(review.createdAt))}
                      </time>
                    </article>
                  ))}
                </>
              ) : (
                <p>Ainda não há avaliações para este NFT.</p>
              )}
            </div>
          )}
        </div>
      </section>
      <RelatedNfts id={nft.id} />
    </article>
  )
}

export function NftPage({ nftId }: { nftId: string }) {
  const query = useNft(nftId)
  useEffect(() => {
    const name = query.data?.name
    setPageMetadata(
      name ? `${name} | Kurio` : 'Detalhes de NFT | Kurio',
      name
        ? `Veja preço, edição, atributos e disponibilidade de ${name} no marketplace Kurio.`
        : 'Consulte detalhes e disponibilidade de NFTs no marketplace Kurio.',
    )
  }, [query.data?.name])
  if (query.isPending)
    return (
      <section
        className="nft-detail-loading"
        aria-label="Carregando detalhes do NFT"
        aria-busy="true"
      >
        <h1 className="sr-only">Carregando NFT</h1>
        <div className="nft-detail-skeleton" />
        <div className="nft-detail-skeleton" />
      </section>
    )
  if (query.isError) {
    const missing =
      query.error instanceof ApiError && query.error.status === 404
    return (
      <section className="nft-detail-state" role="alert">
        <h1>
          {missing
            ? 'NFT não encontrado'
            : 'Não foi possível carregar este NFT'}
        </h1>
        <p>
          {missing
            ? 'Este NFT não existe ou não está disponível no catálogo.'
            : 'Verifique sua conexão e tente novamente.'}
        </p>
        {!missing && (
          <PrimaryButton onClick={() => void query.refetch()}>
            Tentar novamente
          </PrimaryButton>
        )}
        <SecondaryButton asChild>
          <Link to="/marketplace">Voltar ao mercado</Link>
        </SecondaryButton>
      </section>
    )
  }
  return (
    <NftContent
      key={query.data.id}
      nft={query.data}
      refreshing={query.isFetching}
      refresh={() => void query.refetch()}
    />
  )
}
