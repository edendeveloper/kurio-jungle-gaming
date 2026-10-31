import { useId, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function SearchInput({
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  const id = useId()
  return (
    <div className={cn('search-input', className)}>
      <img src="/assets/icons/search-mobile.svg" alt="" aria-hidden="true" width="22" height="22" />
      <label className="sr-only" htmlFor={id}>
        Buscar NFTs ou coleções
      </label>
      <input
        id={id}
        type="search"
        placeholder="Explorar coleções"
        aria-describedby={`${id}-help`}
        {...props}
      />
      <span id={`${id}-help`} className="sr-only">
        Busque por nome do NFT ou da coleção. Os resultados são atualizados após
        uma breve pausa.
      </span>
    </div>
  )
}
