import {
  categories,
  networks,
  sorts,
  type CatalogFilters,
  type CatalogSearch,
} from '../types/catalog'

import { decimalEth, ethUnits } from '@/lib/money'
export { decimalEth, ethUnits } from '@/lib/money'

export function validateCatalogSearch(
  input: Record<string, unknown>,
): CatalogSearch {
  const output: CatalogSearch = {}
  if (typeof input.search === 'string' && input.search.trim())
    output.search = input.search.trim().slice(0, 100)
  const category = categories.find(([id]) => id === input.category)?.[0]
  const network = networks.find(([id]) => id === input.network)?.[0]
  const sort = sorts.find(([id]) => id === input.sort)?.[0]
  if (category) output.category = category
  if (network) output.network = network
  if (sort && sort !== 'recent') output.sort = sort
  if (input.tab === 'new' || input.tab === 'trending') output.tab = input.tab
  const min = decimalEth(input.minPrice),
    max = decimalEth(input.maxPrice)
  if (min !== undefined) output.minPrice = min
  if (max !== undefined) output.maxPrice = max
  if (min !== undefined && max !== undefined && ethUnits(min) > ethUnits(max)) {
    delete output.minPrice
    delete output.maxPrice
  }
  for (const key of ['page', 'pageSize'] as const) {
    const raw = input[key]
    const value =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string' && /^\d+$/.test(raw)
          ? Number(raw)
          : NaN
    const limit = key === 'page' ? 10000 : 36
    if (
      Number.isSafeInteger(value) &&
      value >= 1 &&
      value <= limit &&
      value !== (key === 'page' ? 1 : 9)
    )
      output[key] = value
  }
  return output
}
export function normalizeFilters(search: CatalogSearch): CatalogFilters {
  const valid = validateCatalogSearch(search as Record<string, unknown>)
  return {
    ...valid,
    search: valid.search ?? '',
    sort: valid.sort ?? 'recent',
    tab: valid.tab ?? 'all',
    page: valid.page ?? 1,
    pageSize: valid.pageSize ?? 9,
  }
}
export function sameFilterSet(a: CatalogFilters, b: CatalogFilters) {
  return (
    a.search === b.search &&
    a.category === b.category &&
    a.network === b.network &&
    a.minPrice === b.minPrice &&
    a.maxPrice === b.maxPrice &&
    a.sort === b.sort &&
    a.tab === b.tab &&
    a.pageSize === b.pageSize
  )
}
