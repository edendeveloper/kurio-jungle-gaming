export const artwork = {
  emerald: '/assets/nfts/emerald-ape.webp',
  sage: '/assets/nfts/sage-nomad.webp',
  neon: '/assets/nfts/neon-vessel.webp',
  golden: '/assets/nfts/golden-beat.webp',
} as const

export const promotions = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    description:
      'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: artwork.emerald,
  },
  {
    title: 'Arte digital selecionada e muito mais',
    description:
      'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: artwork.neon,
  },
] as const

export const articles = [
  {
    title: 'Como funciona a propriedade de NFTs',
    date: '12 de setembro',
    minutes: 6,
    description: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: artwork.neon,
  },
  {
    title: '10 artistas digitais para acompanhar',
    date: '13 de setembro',
    minutes: 2,
    description: 'Conheça criadores que moldam a cultura digital.',
    image: artwork.emerald,
  },
  {
    title: 'Raridade, atributos e procedência',
    date: '15 de setembro',
    minutes: 3,
    description:
      'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: artwork.sage,
  },
  {
    title: 'Como proteger sua carteira',
    date: '15 de setembro',
    minutes: 2,
    description: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: artwork.golden,
  },
] as const
