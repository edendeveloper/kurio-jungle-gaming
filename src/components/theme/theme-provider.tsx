import {
  useCallback,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'
import { ThemeContext, type Theme } from './theme-context'
const storageKey = 'kurio:theme'

function setDocumentTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#F7F1E7' : '#140D0A')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  )

  useLayoutEffect(() => setDocumentTheme(theme), [theme])

  const toggleTheme = useCallback(() => {
    const requested: Theme = theme === 'dark' ? 'light' : 'dark'
    let next = requested
    try {
      window.localStorage.setItem(storageKey, requested)
    } catch {
      next = 'dark'
      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        // Keep the current document usable when browser storage is restricted.
      }
    }
    setDocumentTheme(next)
    setTheme(next)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
