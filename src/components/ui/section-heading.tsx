import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SectionHeading({
  children,
  description,
  className,
}: {
  children: ReactNode
  description?: string
  className?: string
}) {
  return (
    <div className={cn('section-heading', className)}>
      <h2>{children}</h2>
      {description && <p>{description}</p>}
    </div>
  )
}
