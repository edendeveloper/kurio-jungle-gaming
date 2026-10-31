import { useEffect, useRef, useState } from 'react'
import { NFTCard } from '@/components/marketplace/nft-card'
import { SectionHeading } from '@/components/ui/section-heading'
import { SecondaryButton } from '@/components/ui/button'
import { useNFTs } from '@/features/marketplace/hooks/use-nfts'
import type { Nft } from '@/types/nft'

// Curation only: names, prices, availability and artwork always come from GET /nfts.
const recommendationIds = [
  'cosmic-bloom-118',
  'violet-nomad-314',
  'ivory-baron-088',
  'golden-beat-207',
  'golden-signal-160',
  'emerald-ape-042',
  'sage-nomad-009',
  'neon-vessel-552',
] as const

function RecommendationCarousel({ items }: { items: Nft[] }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [perPage, setPerPage] = useState(5)
  const [page, setPage] = useState(0)
  useEffect(() => {
    const element = viewport.current!
    const observer = new ResizeObserver(([entry]) => {
      setPerPage(
        entry.contentRect.width >= 1100
          ? 5
          : entry.contentRect.width >= 650
            ? 3
            : 2,
      )
      setPage(0)
      element.scrollLeft = 0
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const pageCount = Math.ceil(items.length / perPage)
  return (
    <div
      role="group"
      aria-roledescription="carrossel"
      aria-label="NFTs recomendados"
    >
      <div
        ref={viewport}
        className="recommendation-viewport"
        tabIndex={0}
        aria-label="Lista de NFTs recomendados"
        onScroll={(event) => {
          const element = event.currentTarget
          setPage(
            Math.max(
              0,
              Math.min(
                pageCount - 1,
                Math.round(element.scrollLeft / element.clientWidth),
              ),
            ),
          )
        }}
      >
        {Array.from({ length: pageCount }, (_, index) => (
          <div
            className="recommendation-slide"
            key={`${perPage}-${index}`}
            style={{
              gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))`,
            }}
            inert={index !== page}
            aria-hidden={index !== page}
          >
            {items.slice(index * perPage, (index + 1) * perPage).map((nft) => (
              <NFTCard nft={nft} key={nft.id} variant="recommendation" />
            ))}
          </div>
        ))}
      </div>
      <nav
        className="recommendation-pagination"
        aria-label="Paginação das recomendações"
      >
        {Array.from({ length: pageCount }, (_, index) => (
          <button
            type="button"
            key={index}
            aria-label={`Mostrar recomendações, página ${index + 1}`}
            aria-current={index === page ? 'page' : undefined}
            onClick={() => {
              const element = viewport.current!
              element.scrollTo({
                left: index * element.clientWidth,
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'instant'
                  : 'smooth',
              })
            }}
          >
            <span />
          </button>
        ))}
      </nav>
      <p className="sr-only" role="status">
        Página {page + 1} de {pageCount} das recomendações
      </p>
    </div>
  )
}

export function CartRecommendations() {
  const query = useNFTs({ pageSize: 36 })
  const items = recommendationIds.flatMap((id) => {
    const nft = query.data?.items.find((item) => item.id === id)
    return nft ? [nft] : []
  })
  return (
    <section
      className="cart-recommendations"
      aria-label="Colecionadores também viram"
    >
      <SectionHeading>Colecionadores também viram</SectionHeading>
      {query.isPending ? (
        <div
          className="recommendation-skeletons"
          role="status"
          aria-label="Carregando recomendações"
          aria-busy="true"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <div className="recommendation-skeleton" key={index} />
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="recommendation-message">
          <p>
            Não foi possível carregar as recomendações. Seu carrinho continua
            disponível.
          </p>
          <SecondaryButton onClick={() => void query.refetch()}>
            Tentar carregar recomendações
          </SecondaryButton>
        </div>
      ) : items.length ? (
        <RecommendationCarousel items={items} />
      ) : (
        <p className="recommendation-message">
          Nenhuma recomendação disponível no momento.
        </p>
      )}
    </section>
  )
}
