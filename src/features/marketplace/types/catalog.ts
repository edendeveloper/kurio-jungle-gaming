import type { Nft } from '@/types/nft'

export const categories = [
  ['digital-art', 'Arte digital'],
  ['photography', 'Fotografia'],
  ['music', 'Música'],
  ['3d-art', 'Arte 3D'],
  ['collectibles', 'Colecionáveis'],
  ['generative', 'Generativa'],
  ['gaming', 'Jogos'],
  ['memberships', 'Assinaturas'],
  ['utility', 'Utilidade'],
] as const
export const networks = [
  ['ethereum', 'Ethereum'],
  ['polygon', 'Polygon'],
  ['solana', 'Solana'],
] as const
export const sorts = [
  ['recent', 'Mais recentes'],
  ['price_asc', 'Menor preço'],
  ['price_desc', 'Maior preço'],
  ['popular', 'Mais populares'],
] as const
export type Category = (typeof categories)[number][0]
export type Network = (typeof networks)[number][0]
export type Sort = (typeof sorts)[number][0]
export type CatalogTab = 'all' | 'new' | 'trending'
export interface CatalogSearch {
  search?: string
  category?: Category
  network?: Network
  minPrice?: string
  maxPrice?: string
  sort?: Sort
  tab?: CatalogTab
  page?: number
  pageSize?: number
}
export interface CatalogFilters extends CatalogSearch {
  search: string
  sort: Sort
  tab: CatalogTab
  page: number
  pageSize: number
}
export interface CatalogResponse {
  items: Nft[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}
