import { http, HttpResponse } from 'msw'
import { env } from '@/lib/env'
import { getNftRecords } from '../data/nft-detail'
import {
  ethUnits,
  validateCatalogSearch,
  normalizeFilters,
} from '@/features/marketplace/utils/filters'
import type { CatalogResponse } from '@/features/marketplace/types/catalog'

export const nftsHandler = http.get(
  `${env.apiBaseUrl.replace(/\/$/, '')}/nfts`,
  async ({ request }) => {
    const params = new URL(request.url).searchParams
    const raw = Object.fromEntries(params)
    const known = [
      'search',
      'category',
      'network',
      'minPrice',
      'maxPrice',
      'sort',
      'tab',
      'page',
      'pageSize',
    ]
    const normalized = validateCatalogSearch(raw)
    const filters = normalizeFilters(normalized)
    const invalid =
      [...params.keys()].some(
        (key) => !known.includes(key) || params.getAll(key).length !== 1,
      ) ||
      Object.entries(raw).some(([key, value]) => {
        if (key === 'search') return value.length > 100
        if (key === 'sort')
          return !['recent', 'price_asc', 'price_desc', 'popular'].includes(
            value,
          )
        if (key === 'tab') return !['all', 'new', 'trending'].includes(value)
        if (key === 'page')
          return (
            !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 10000
          )
        if (key === 'pageSize')
          return !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 36
        return (
          value !== '' &&
          normalized[key as keyof typeof normalized] === undefined
        )
      })
    if (invalid)
      return HttpResponse.json(
        {
          code: 'INVALID_FILTERS',
          message: 'Parâmetros de catálogo inválidos.',
        },
        { status: 400 },
      )
    const scenario = localStorage.getItem('kurio:catalog-scenario')
    const latency =
      scenario === 'slow'
        ? 1500
        : scenario === 'out-of-order'
          ? filters.search === 'sage'
            ? 1000
            : 80
          : 120
    await new Promise((resolve) => setTimeout(resolve, latency))
    if (scenario === 'error')
      return HttpResponse.json(
        {
          code: 'CATALOG_UNAVAILABLE',
          message: 'Catálogo temporariamente indisponível.',
        },
        { status: 503 },
      )
    if (scenario === 'connection-error') return HttpResponse.error()
    let items = (scenario === 'empty' ? [] : getNftRecords()).filter((nft) => {
      const text = `${nft.name} ${nft.collection}`.toLocaleLowerCase('pt-BR')
      return (
        (!filters.search ||
          text.includes(filters.search.toLocaleLowerCase('pt-BR'))) &&
        (!filters.category || nft.category === filters.category) &&
        (!filters.network || nft.network === filters.network) &&
        (filters.minPrice === undefined ||
          ethUnits(nft.priceEth) >= ethUnits(filters.minPrice)) &&
        (filters.maxPrice === undefined ||
          ethUnits(nft.priceEth) <= ethUnits(filters.maxPrice)) &&
        (filters.tab !== 'new' || nft.isNew) &&
        (filters.tab !== 'trending' || nft.popularity >= 80)
      )
    })
    items = [...items].sort((a, b) => {
      let order: number
      if (filters.sort === 'price_asc' || filters.sort === 'price_desc') {
        const delta = ethUnits(a.priceEth) - ethUnits(b.priceEth)
        order = delta < 0n ? -1 : delta > 0n ? 1 : 0
        if (filters.sort === 'price_desc') order *= -1
      } else if (filters.sort === 'popular') order = b.popularity - a.popularity
      else order = b.createdAt.localeCompare(a.createdAt)
      return order || a.id.localeCompare(b.id)
    })
    const totalItems = items.length,
      totalPages = Math.ceil(totalItems / filters.pageSize)
    const page = Math.min(filters.page, Math.max(1, totalPages))
    const response: CatalogResponse = {
      items: items.slice(
        (page - 1) * filters.pageSize,
        page * filters.pageSize,
      ),
      pagination: { page, pageSize: filters.pageSize, totalItems, totalPages },
    }
    return HttpResponse.json(response)
  },
)
