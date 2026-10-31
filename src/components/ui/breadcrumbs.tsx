import { Link } from '@tanstack/react-router'

export interface BreadcrumbItem {
  label: string
  to?:
    | '/'
    | '/marketplace'
    | '/cart'
    | '/checkout'
    | '/profile'
    | '/profile/wallets'
}

export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Caminho da página">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            className="flex items-center gap-2"
          >
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.to && index < items.length - 1 ? (
              <Link to={item.to} className="hover:text-text-accent">
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={index === items.length - 1 ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
