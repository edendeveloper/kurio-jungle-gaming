export type NftCategory =
  | 'digital-art'
  | 'photography'
  | 'music'
  | '3d-art'
  | 'collectibles'
  | 'generative'
  | 'gaming'
  | 'memberships'
  | 'utility'
export type NftNetwork = 'ethereum' | 'polygon' | 'solana'
export interface Nft {
  id: string
  name: string
  imageAlt: string
  portrait?: boolean
  tokenId: string
  description: string
  imageUrl: string
  images: string[]
  priceEth: string
  originalPriceEth?: string
  category: NftCategory
  collection: string
  network: NftNetwork
  edition: number
  totalEditions: number
  rarity: 'common' | 'rare' | 'legendary'
  createdAt: string
  popularity: number
  isFeatured: boolean
  isNew: boolean
  availability: number
  /** Monotonic version used to reconcile REST snapshots and realtime events. */
  version?: number
}
