import { useId } from 'react'

export interface TabItem {
  id: string
  label: string
  disabled?: boolean
}

// Only the current panel is available in this stage. Future panels stay explicitly disabled.
export function Tabs({
  items,
  activeId,
  panelId,
  onChange,
  label = 'Categorias de NFTs',
}: {
  items: readonly TabItem[]
  activeId: string
  panelId: string
  onChange?: (id: string) => void
  label?: string
}) {
  const id = useId()
  return (
    <div className="catalog-tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          id={item.id === activeId ? `${panelId}-tab` : `${id}-${item.id}`}
          role="tab"
          aria-selected={item.id === activeId}
          aria-controls={item.id === activeId ? panelId : undefined}
          aria-disabled={item.disabled || undefined}
          tabIndex={item.id === activeId ? 0 : -1}
          title={item.disabled ? 'Disponível em breve' : undefined}
          onClick={() => {
            if (!item.disabled) onChange?.(item.id)
          }}
          onKeyDown={(event) => {
            const enabled = items.filter((item) => !item.disabled)
            const index = enabled.findIndex((tab) => tab.id === item.id)
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? enabled.length - 1
                  : event.key === 'ArrowRight'
                    ? (index + 1) % enabled.length
                    : event.key === 'ArrowLeft'
                      ? (index + enabled.length - 1) % enabled.length
                      : -1
            if (next < 0) return
            event.preventDefault()
            onChange?.(enabled[next].id)
            const buttons =
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                '[role="tab"]:not([aria-disabled="true"])',
              )
            buttons?.[next]?.focus()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
