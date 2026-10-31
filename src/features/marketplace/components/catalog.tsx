import { useEffect, useId, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, LoaderCircle, X } from 'lucide-react'
import { NFTCard } from '@/components/marketplace/nft-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { FilterTrigger } from '@/components/ui/filter-trigger'
import { Tabs } from '@/components/ui/tabs'
import { useCatalogUrl } from '../hooks/use-catalog-url'
import { useNFTs } from '../hooks/use-nfts'
import {
  sorts,
  type CatalogSearch,
  type CatalogTab,
  type Sort,
} from '../types/catalog'
import { CatalogFiltersForm } from './catalog-filters'
import { nftImageSrcSet } from '@/lib/nft-image'
import { useNft } from '@/features/nft/hooks'
import { PriceLabel } from '@/components/ui/price-label'
import { discountPercent } from '@/lib/money'
import { Link } from '@tanstack/react-router'

function FeaturedNft() {
  const query = useNft('sage-nomad-009')
  const nft = query.data
  const discount =
    nft?.originalPriceEth &&
    discountPercent(nft.priceEth, nft.originalPriceEth)
  const token = nft?.tokenId.padStart(3, '0')
  const featuredName = nft
    ? /#\d+/.test(nft.name)
      ? nft.name
      : `${nft.name} #${token}`
    : ''

  return (
    <div className="featured-banner">
      <h2>NFT EM DESTAQUE</h2>
      {query.isPending ? (
        <p role="status" className="featured-status">
          Carregando destaque…
        </p>
      ) : query.isError || !nft ? (
        <div className="featured-status" role="alert">
          <p>Não foi possível carregar o NFT em destaque.</p>
          <button type="button" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <p className="featured-tag">OBRA EM DESTAQUE</p>
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="featured-art-link"
            aria-label={`Ver detalhes de ${featuredName}`}
          >
            <img
              src={nft.imageUrl}
              srcSet={nftImageSrcSet(nft.imageUrl)}
              sizes="300px"
              alt={nft.imageAlt}
              width="1254"
              height="1254"
              loading="lazy"
            />
          </Link>
          <div className="featured-details">
            <h3>{featuredName}</h3>
            <div className="featured-price-row">
              <PriceLabel
                amount={nft.priceEth}
                previousAmount={discount ? nft.originalPriceEth : undefined}
              />
              {discount && <span className="featured-discount">−{discount}</span>}
            </div>
            <Link
              className="featured-cta"
              to="/nft/$nftId"
              params={{ nftId: nft.id }}
            >
              {discount ? 'Ver oferta' : 'Ver NFT'}
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function SearchControl({
  applied,
  update,
}: {
  applied: string
  update: (patch: CatalogSearch) => void
}) {
  const [editor, setEditor] = useState<{
    draft: string
    applied: string
    submitted?: string
  }>({ draft: applied, applied })
  // URL acknowledgements preserve ongoing edits. History/other controls replace the draft.
  // Reconcile state without replacing the DOM node or resetting its selection/focus.
  if (editor.applied !== applied) {
    setEditor({
      draft: editor.submitted === applied ? editor.draft : applied,
      applied,
    })
  }
  const { draft } = editor
  useEffect(() => {
    const search = draft.trim()
    if (search === applied) return
    const timer = setTimeout(() => {
      setEditor((previous) => ({ ...previous, submitted: search }))
      update({ search: search || undefined })
    }, 300)
    return () => clearTimeout(timer)
  }, [draft, applied, update])
  const pending = draft.trim() !== applied
  return (
    <div className="catalog-search-control">
      <SearchInput
        value={draft}
        onChange={(event) => {
          const value = event.target.value
          setEditor((previous) => ({ ...previous, draft: value }))
        }}
        maxLength={100}
      />
      {draft && (
        <button
          type="button"
          className="clear-search"
          aria-label="Limpar pesquisa"
          onClick={() => {
            setEditor((previous) => ({ ...previous, draft: '', submitted: '' }))
            update({ search: undefined })
          }}
        >
          <X size={18} />
        </button>
      )}
      {pending && (
        <span className="sr-only" role="status">
          Aguardando pesquisa
        </span>
      )}
    </div>
  )
}

export function CatalogSearchBar({ mobile = false }: { mobile?: boolean }) {
  const { filters, update, clear } = useCatalogUrl()
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  return (
    <div
      className={
        mobile ? 'mobile-search live-mobile-search' : 'catalog-desktop-search'
      }
    >
      <SearchControl applied={filters.search} update={update} />
      {mobile && (
        <>
          <FilterTrigger
            onClick={() => dialog.current?.showModal()}
            aria-haspopup="dialog"
            aria-controls={id}
          />
          <dialog
            ref={dialog}
            id={id}
            className="filter-drawer"
            aria-labelledby={`${id}-title`}
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return
              const controls = [
                ...event.currentTarget.querySelectorAll<HTMLElement>(
                  'button, input, select, a[href], [tabindex]',
                ),
              ].filter(
                (element) =>
                  element.tabIndex >= 0 &&
                  !element.hasAttribute('disabled') &&
                  element.getClientRects().length > 0,
              )
              const first = controls[0],
                last = controls.at(-1)
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last?.focus()
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first?.focus()
              }
            }}
          >
            <div className="drawer-heading">
              <h2 id={`${id}-title`}>Filtros do catálogo</h2>
              <button
                type="button"
                aria-label="Fechar filtros"
                onClick={() => dialog.current?.close()}
              >
                <X />
              </button>
            </div>
            <CatalogFiltersForm
              filters={filters}
              update={update}
              clear={clear}
            />
            <PrimaryButton
              className="drawer-done"
              onClick={() => dialog.current?.close()}
            >
              Ver resultados
            </PrimaryButton>
          </dialog>
        </>
      )}
    </div>
  )
}

function Skeletons() {
  return (
    <div className="catalog-skeletons" aria-label="Carregando NFTs">
      {Array.from({ length: 9 }, (_, index) => (
        <div className="nft-skeleton" key={index}>
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}

export function Catalog() {
  const { filters, update, clear } = useCatalogUrl()
  const query = useNFTs(filters)
  const response = query.data
  useEffect(() => {
    if (
      response &&
      !query.isPlaceholderData &&
      response.pagination.page !== filters.page
    )
      update({ page: response.pagination.page }, true)
  }, [response, filters.page, query.isPlaceholderData, update])
  const pagination = response?.pagination
  return (
    <section
      id="catalogo"
      className="catalog live-catalog"
      aria-label="Catálogo de NFTs"
    >
      <aside className="filter-sidebar" aria-label="Filtros do catálogo">
        <CatalogFiltersForm filters={filters} update={update} clear={clear} />
        <FeaturedNft />
      </aside>
      <div className="catalog-content">
        <CatalogSearchBar />
        <div className="catalog-toolbar">
          <Tabs
            items={[
              { id: 'all', label: 'Todos os NFTs' },
              { id: 'new', label: 'Novos lançamentos' },
              { id: 'trending', label: 'Em alta' },
            ]}
            activeId={filters.tab}
            panelId="nft-results"
            onChange={(id) => update({ tab: id as CatalogTab })}
          />
          <label className="catalog-sort">
            Ordenar por:
            <select
              aria-label="Ordenar por"
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value as Sort })}
            >
              {sorts.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="catalog-feedback" aria-live="polite" aria-atomic="true">
          {query.isFetching ? (
            <span className="catalog-fetching">
              <LoaderCircle size={16} aria-hidden="true" />
              {query.isPending ? 'Carregando NFTs…' : 'Atualizando catálogo…'}
            </span>
          ) : query.isError ? (
            'Não foi possível atualizar o catálogo.'
          ) : pagination ? (
            `${pagination.totalItems} NFTs encontrados · Página ${pagination.page} de ${Math.max(1, pagination.totalPages)}`
          ) : (
            ''
          )}
        </div>
        <div
          id="nft-results"
          role="tabpanel"
          aria-labelledby="nft-results-tab"
          tabIndex={0}
          aria-busy={query.isFetching}
        >
          {query.isPending ? (
            <Skeletons />
          ) : query.isError ? (
            <div className="catalog-state" role="alert">
              <h2>Não foi possível carregar os NFTs</h2>
              <p>Verifique sua conexão e tente novamente.</p>
              <PrimaryButton
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                Tentar novamente
              </PrimaryButton>
            </div>
          ) : response?.items.length === 0 ? (
            <div className="catalog-state">
              <h2>Nenhum NFT encontrado</h2>
              <p>Tente outra pesquisa ou remova os filtros.</p>
              <SecondaryButton onClick={clear}>Limpar filtros</SecondaryButton>
            </div>
          ) : (
            <>
              <div className="desktop-nft-grid">
                {response?.items.map((nft) => (
                  <NFTCard key={nft.id} nft={nft} />
                ))}
              </div>
              <div className="mobile-nft-grid">
                {response?.items.map((nft, index) => (
                  <NFTCard
                    key={nft.id}
                    nft={nft}
                    mobile
                    showFavorite={index === 0}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        {!query.isError && pagination && pagination.totalPages > 0 && (
          <nav className="pagination" aria-label="Paginação do catálogo">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={pagination.page <= 1 || query.isFetching}
              onClick={() => update({ page: pagination.page - 1 })}
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from(
              { length: pagination.totalPages },
              (_, index) => index + 1,
            )
              .filter(
                (page) =>
                  page === 1 ||
                  page === pagination.totalPages ||
                  Math.abs(page - pagination.page) <= 2,
              )
              .map((page) => (
                <button
                  type="button"
                  key={page}
                  aria-label={`Página ${page}`}
                  aria-current={page === pagination.page ? 'page' : undefined}
                  disabled={query.isFetching}
                  onClick={() => update({ page })}
                >
                  {page}
                </button>
              ))}
            <button
              type="button"
              aria-label="Próxima página"
              disabled={
                pagination.page >= pagination.totalPages || query.isFetching
              }
              onClick={() => update({ page: pagination.page + 1 })}
            >
              <ChevronRight size={18} />
            </button>
          </nav>
        )}
      </div>
    </section>
  )
}
