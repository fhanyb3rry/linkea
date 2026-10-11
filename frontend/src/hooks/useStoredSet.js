import { useCallback, useState } from 'react'

// Conjunto de ids guardado en localStorage (conexiones, vacantes guardadas).
// Es solo del navegador: aún no hay cuentas ni persistencia en el backend.
export default function useStoredSet(key) {
  const [set, setSet] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) ?? '[]'))
    } catch {
      return new Set()
    }
  })

  const toggle = useCallback(
    (id) => {
      setSet((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        try {
          localStorage.setItem(key, JSON.stringify([...next]))
        } catch {
          // sin almacenamiento disponible: el cambio dura solo la sesión
        }
        return next
      })
    },
    [key],
  )

  return [set, toggle]
}
