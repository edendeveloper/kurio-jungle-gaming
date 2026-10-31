import type { Nft } from '@/types/nft'
import type { CollectorReview, NftDetail } from '@/types/nft-detail'
import { nftFixtures } from './nfts'
import { readCommerce } from '../store/persistence'
import { readNftOverride } from '../store/realtime'

export function getNftRecords(): Nft[] {
  const scenario = localStorage.getItem('kurio:nft-scenario')
  const confirmed = Object.values(readCommerce().orders).filter(
    (order) => order.status === 'confirmed',
  )
  return nftFixtures
    .map((nft) => {
      const override = readNftOverride(nft.id)
      const fixture =
        nft.id === 'emerald-ape-042' && scenario === 'changed'
          ? { ...nft, priceEth: '1.49', availability: 2, version: 2 }
          : nft.id === 'emerald-ape-042' && scenario === 'sold-out'
            ? { ...nft, availability: 0, version: 2 }
            : nft
      return {
        ...fixture,
        ...(override?.priceEth ? { priceEth: override.priceEth } : {}),
        ...(override?.availability !== undefined ? { availability: override.availability } : {}),
        version: override?.version ?? fixture.version ?? 1,
      }
    })
    .map((nft) => ({
      ...nft,
      availability: Math.max(
        0,
        nft.availability -
          confirmed.reduce(
            (sum, order) =>
              sum +
              order.items
                .filter((item) => item.nftId === nft.id)
                .reduce((count, item) => count + item.quantity, 0),
            0,
          ),
      ),
    }))
}

export function getNftDetail(nft: Nft): NftDetail {
  const collection = getNftRecords().filter(
    (item) => item.collection === nft.collection,
  )
  const artworks = [
    ...new Set([nft.imageUrl, ...collection.map((item) => item.imageUrl)]),
  ]
  const gallery = artworks.map((src, index) => {
    const artwork = collection.find((item) => item.imageUrl === src) ?? nft
    return {
      src,
      alt: artwork.imageAlt,
      label:
        index === 0
          ? `Arte principal de ${nft.name}`
          : `Arte da coleção: ${artwork.name}`,
    }
  })
  const count =
    nft.id === 'emerald-ape-042' ? 19 : nft.id === 'sage-nomad-009' ? 0 : 3
  const comments = [
    'Arte com muitos detalhes e personalidade.',
    'A composição e as cores se destacam na coleção.',
    'Uma boa adição à minha coleção de demonstração.',
  ]
  const reviews: CollectorReview[] = Array.from(
    { length: count },
    (_, index) => ({
      id: `${nft.id}-review-${index + 1}`,
      author: `Colecionador ${index + 1} · demonstração`,
      rating: index < (count === 19 ? 15 : 2) ? 5 : 4,
      comment: comments[index % comments.length],
      createdAt: new Date(Date.UTC(2026, 9, 28 - index)).toISOString(),
    }),
  )
  return {
    ...nft,
    images: gallery.map((image) => image.src),
    gallery,
    reviews,
    rating: count
      ? Math.round(
          (reviews.reduce((sum, review) => sum + review.rating, 0) / count) *
            10,
        ) / 10
      : null,
    reviewCount: count,
    description: `${nft.name}, colecionável digital da coleção ${nft.collection}. Arte e informações apresentadas em ambiente de demonstração.`,
    longDescription: `${nft.name} integra a coleção ${nft.collection}. A edição ${nft.edition}/${nft.totalEditions} apresenta uma identidade própria, explorando cor, luz e cultura digital. A galeria também permite conhecer outras artes da coleção. Os dados de rede, atributos, avaliações e direitos nesta página são simulados para o desafio; não comprovam propriedade ou procedência on-chain.`,
    attributes:
      nft.id === 'emerald-ape-042'
        ? ['Óculos', 'Esmeralda', 'Jaqueta verde']
        : [nft.rarity === 'rare' ? 'Raro' : 'Comum', 'Arte digital'],
    contract: {
      address: null,
      description:
        'Contrato de demonstração; nenhum endereço on-chain real associado.',
      simulated: true,
    },
    royaltyPercent: '5',
    rights:
      'Royalties de demonstração: 5% em vendas secundárias. Nenhuma transferência de direitos ou cobrança é realizada nesta aplicação.',
  }
}
