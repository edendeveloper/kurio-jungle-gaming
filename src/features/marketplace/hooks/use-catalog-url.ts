import { useCallback, useEffect } from 'react'
import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router'
import type { CatalogSearch } from '../types/catalog'
import { normalizeFilters, validateCatalogSearch } from '../utils/filters'

export function useCatalogUrl() {
  const search = useSearch({ strict: false }) as CatalogSearch
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  }) as '/' | '/marketplace'
  const rawSearch = useRouterState({ select: (state) => state.location.search })
  const navigate = useNavigate()
  const canonical = validateCatalogSearch(rawSearch)
  const canonicalKey = JSON.stringify(canonical)
  useEffect(() => {
    if (pathname !== '/' && pathname !== '/marketplace') return
    if (JSON.stringify(rawSearch) !== canonicalKey) {
      void navigate({
        to: pathname,
        search: canonical,
        replace: true,
        resetScroll: false,
      })
    }
  }, [canonicalKey, rawSearch, pathname, navigate, canonical])
  const update = useCallback(
    (patch: CatalogSearch, replace = false) => {
      if (pathname !== '/' && pathname !== '/marketplace') return
      void navigate({
        to: pathname,
        search: (previous) =>
          validateCatalogSearch({ ...previous, page: 1, ...patch }),
        replace,
        resetScroll: false,
      })
    },
    [navigate, pathname],
  )
  const clear = () => {
    if (pathname !== '/' && pathname !== '/marketplace') return
    void navigate({ to: pathname, search: {}, resetScroll: false })
  }
  return { search, filters: normalizeFilters(search), update, clear }
}
