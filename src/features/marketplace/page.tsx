import { Catalog, CatalogSearchBar } from './components/catalog'

export function MarketplacePage() {
  return (
    <div className="marketplace-page">
      <h1>Marketplace</h1>
      <CatalogSearchBar mobile />
      <Catalog />
    </div>
  )
}
