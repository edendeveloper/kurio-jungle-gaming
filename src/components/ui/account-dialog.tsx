import { useEffect, useRef, type ReactNode } from 'react'
import { keepDialogFocus } from './dialog-focus'
export function AccountDialog({
  title,
  close,
  children,
  busy = false,
}: {
  title: string
  close: () => void
  children: ReactNode
  busy?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!,
      trigger = document.activeElement as HTMLElement | null
    element.showModal()
    return () => {
      element.close()
      if (trigger?.isConnected) trigger.focus()
      else document.querySelector<HTMLElement>('[data-account-focus]')?.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="account-dialog"
      aria-label={title}
      onKeyDown={keepDialogFocus}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) close()
      }}
    >
      <h2>{title}</h2>
      {children}
      <button
        type="button"
        className="dialog-close"
        aria-label="Fechar diálogo"
        disabled={busy}
        onClick={close}
      >
        ×
      </button>
    </dialog>
  )
}
