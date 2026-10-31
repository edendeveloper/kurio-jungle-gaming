import { Moon, Sun } from 'lucide-react'
import { useTheme } from './theme-context'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const current = theme === 'light' ? 'claro' : 'escuro'
  return (
    <button
      type="button"
      className={`theme-toggle${compact ? ' theme-toggle-compact' : ''}`}
      aria-label={`Alternar tema. Tema atual: ${current}`}
      aria-pressed={theme === 'light'}
      title={`Tema atual: ${current}`}
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
      {!compact && <span>{theme === 'light' ? 'Claro' : 'Escuro'}</span>}
    </button>
  )
}
