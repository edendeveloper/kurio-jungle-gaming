import { createContext, useContext } from 'react'

export type Theme = 'dark' | 'light'
export const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
} | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme deve ser usado dentro de ThemeProvider.')
  return context
}
