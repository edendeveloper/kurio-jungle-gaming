import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function FilterTrigger({
  className,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn('filter-trigger', className)}
      aria-label="Abrir filtros"
      title="Filtros"
      {...props}
    >
      <img src="/assets/icons/filter-mobile.svg" alt="" aria-hidden="true" width="16" height="16" />
    </button>
  )
}
