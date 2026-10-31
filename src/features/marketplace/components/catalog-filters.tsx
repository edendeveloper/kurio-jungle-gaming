import { useId, useState } from 'react'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import {
  categories,
  networks,
  type CatalogFilters,
  type CatalogSearch,
} from '../types/catalog'
import { decimalEth, ethUnits } from '../utils/filters'

export function CatalogFiltersForm({
  filters,
  update,
  clear,
}: {
  filters: CatalogFilters
  update: (patch: CatalogSearch) => void
  clear: () => void
}) {
  const id = useId()
  const [min, setMin] = useState(filters.minPrice ?? '')
  const [max, setMax] = useState(filters.maxPrice ?? '')
  const [error, setError] = useState('')
  const appliedPrice = `${filters.minPrice ?? ''}:${filters.maxPrice ?? ''}`
  const [previousPrice, setPreviousPrice] = useState(appliedPrice)
  if (previousPrice !== appliedPrice) {
    setPreviousPrice(appliedPrice)
    setMin(filters.minPrice ?? '')
    setMax(filters.maxPrice ?? '')
    setError('')
  }
  function applyPrice(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const lo = min.trim() ? decimalEth(min) : undefined
    const hi = max.trim() ? decimalEth(max) : undefined
    if ((min.trim() && lo === undefined) || (max.trim() && hi === undefined)) {
      setError(
        'Use valores positivos ou zero, com ponto decimal e até 18 casas decimais.',
      )
      return
    }
    if (lo !== undefined && hi !== undefined && ethUnits(lo) > ethUnits(hi)) {
      setError('O preço mínimo não pode ser maior que o máximo.')
      return
    }
    setError('')
    update({ minPrice: lo, maxPrice: hi })
  }
  return (
    <div className="filters-panel live-filters">
      <fieldset>
        <legend>Categorias</legend>
        <div className="filter-options">
          <label>
            <input
              type="radio"
              name={`${id}-category`}
              checked={!filters.category}
              onChange={() => update({ category: undefined })}
            />
            Todas as categorias
          </label>
          {categories.map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name={`${id}-category`}
                checked={filters.category === value}
                onChange={() => update({ category: value })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <form onSubmit={applyPrice} noValidate>
        <h2>Faixa de preço</h2>
        <div className="price-inputs">
          <label htmlFor={`${id}-min`}>Mínimo (ETH)</label>
          <input
            id={`${id}-min`}
            inputMode="decimal"
            value={min}
            onChange={(event) => setMin(event.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            placeholder="0"
          />
          <label htmlFor={`${id}-max`}>Máximo (ETH)</label>
          <input
            id={`${id}-max`}
            inputMode="decimal"
            value={max}
            onChange={(event) => setMax(event.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            placeholder="Sem limite"
          />
          {error && (
            <p id={`${id}-error`} role="alert" className="field-error">
              {error}
            </p>
          )}
          <PrimaryButton type="submit">Aplicar preço</PrimaryButton>
        </div>
      </form>
      <fieldset>
        <legend>Rede</legend>
        <div className="filter-options">
          <label>
            <input
              type="radio"
              name={`${id}-network`}
              checked={!filters.network}
              onChange={() => update({ network: undefined })}
            />
            Todas as redes
          </label>
          {networks.map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name={`${id}-network`}
                checked={filters.network === value}
                onChange={() => update({ network: value })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <SecondaryButton
        onClick={() => {
          setMin('')
          setMax('')
          setError('')
          clear()
        }}
      >
        Limpar filtros
      </SecondaryButton>
    </div>
  )
}
