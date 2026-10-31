import type { Nft } from './nft'

export interface CollectorReview {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: string
}
export interface NftDetail extends Nft {
  gallery: { src: string; alt: string; label: string }[]
  attributes: string[]
  reviews: CollectorReview[]
  rating: number | null
  reviewCount: number
  longDescription: string
  contract: { address: null; description: string; simulated: true }
  royaltyPercent: string
  rights: string
}
