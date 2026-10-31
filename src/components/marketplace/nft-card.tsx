import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { PriceLabel } from '@/components/ui/price-label'
import type { Nft } from '@/types/nft'
import { cn } from '@/lib/utils'
import { nftImageSrcSet } from '@/lib/nft-image'

export function NFTCard({
  nft,
  mobile = false,
  showFavorite = false,
  variant = 'catalog',
}: {
  nft: Nft
  mobile?: boolean
  showFavorite?: boolean
  variant?: 'catalog' | 'recommendation'
}) {
  const label = nft.name ?? 'NFT sem título no design'
  return (
    <article
      className={cn(
        'nft-card',
        nft.portrait && 'nft-card-portrait',
        mobile && 'nft-card-mobile',
        variant === 'recommendation' && 'nft-card-recommendation',
      )}
      data-testid="nft-card"
    >
      <div className="nft-card-art">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          aria-label={`Ver ${label}`}
          className="nft-art-link"
        >
          <img
            src={nft.imageUrl}
            srcSet={nftImageSrcSet(nft.imageUrl)}
            sizes="(max-width: 767px) 50vw, (max-width: 1279px) 32vw, 360px"
            alt={nft.imageAlt}
            loading="lazy"
            width="1024"
            height="1024"
          />
        </Link>
        {mobile &&
          (nft.rarity === 'rare' ? (
            <Badge className="nft-rarity">RARO</Badge>
          ) : showFavorite ? (
            <button
              className="nft-favorite"
              type="button"
              aria-label={`Favoritar ${label} (em breve)`}
              aria-disabled="true"
              title="Favoritos em breve"
            >
              <img
                src="/assets/icons/favorite-mobile.svg"
                alt=""
                width="28"
                height="28"
              />
            </button>
          ) : null)}
      </div>
      <div className="nft-card-info">
        {nft.name ? (
          <h3>
            <Link to="/nft/$nftId" params={{ nftId: nft.id }}>
              {nft.name}
            </Link>
          </h3>
        ) : (
          <h3 className="sr-only">{label}</h3>
        )}
        {nft.priceEth && (
          <PriceLabel
            amount={nft.priceEth}
            previousAmount={
              mobile || variant === 'recommendation'
                ? undefined
                : nft.originalPriceEth
            }
          />
        )}
      </div>
    </article>
  )
}
