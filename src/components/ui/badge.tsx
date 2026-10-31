import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Badge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center bg-primary px-2 py-1 text-xs font-medium text-primary-foreground',
        className,
      )}
      {...props}
    />
  )
}
