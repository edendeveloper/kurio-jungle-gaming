import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, X, ZoomIn } from 'lucide-react'
import type { NftDetail } from '@/types/nft-detail'
import { nftImageSrcSet } from '@/lib/nft-image'

export function NftGallery({
  nft,
  favoriteButton,
}: {
  nft: NftDetail
  favoriteButton: React.ReactNode
}) {
  const [selected, setSelected] = useState(0)
  const image = nft.gallery[selected] ?? nft.gallery[0]
  const zoom = useRef<HTMLDialogElement>(null)
  return (
    <section className="nft-gallery" aria-label="Galeria de imagens">
      <div className="nft-mobile-controls">
        <Link to="/marketplace" aria-label="Voltar ao mercado">
          <ArrowLeft size={20} />
        </Link>
        {favoriteButton}
      </div>
      <div className="nft-thumbnails" aria-label="Imagens da coleção">
        {nft.gallery.map((item, index) => (
          <button
            key={item.src}
            type="button"
            aria-label={`Ver imagem ${index + 1}: ${item.label}`}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            <img
              src={item.src}
              srcSet={nftImageSrcSet(item.src)}
              sizes="80px"
              alt={item.alt}
              width="1254"
              height="1254"
            />
            <span className="sr-only">{index + 1}</span>
          </button>
        ))}
      </div>
      <div className="nft-main-image">
        <button
          type="button"
          className="nft-enlarge-image"
          aria-label="Ampliar imagem do NFT"
          onClick={() => zoom.current?.showModal()}
        >
          <img
            src={image.src}
            srcSet={nftImageSrcSet(image.src)}
            sizes="(max-width: 767px) calc(100vw - 48px), 560px"
            alt={`${image.label}. ${image.alt}`}
            width="1254"
            height="1254"
            fetchPriority="high"
          />
        </button>
        <button
          className="nft-zoom-trigger"
          type="button"
          aria-label="Abrir imagem ampliada"
          onClick={() => zoom.current?.showModal()}
        >
          <ZoomIn size={20} />
        </button>
      </div>
      <dialog
        ref={zoom}
        className="nft-zoom-dialog"
        aria-labelledby={`zoom-${nft.id}`}
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            event.preventDefault()
            event.currentTarget
              .querySelector<HTMLButtonElement>('button')
              ?.focus()
          }
        }}
      >
        <h2 id={`zoom-${nft.id}`} className="sr-only">
          Imagem ampliada de {nft.name}
        </h2>
        <button
          type="button"
          aria-label="Fechar imagem ampliada"
          onClick={() => zoom.current?.close()}
        >
          <X />
        </button>
        <img
          src={image.src}
          alt={`${image.label}. ${image.alt}`}
          width="1254"
          height="1254"
        />
      </dialog>
    </section>
  )
}
