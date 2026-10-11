import { useCallback, useState } from 'react'

const KEY = 'linkea-theme'

export default function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // sin almacenamiento disponible: el tema solo dura la sesión
    }
    setTheme(next)
  }, [theme])

  return { theme, toggle }
}
