import { useState } from 'react'

// Ejecuta acciones contra la API que devuelven el seguimiento actualizado.
// `busy` dice qué acción está en curso (para deshabilitar solo ese botón).
export default function useAccion(onChange) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  async function run(key, action) {
    setBusy(key)
    setError(null)
    try {
      const actualizado = await action()
      if (actualizado) onChange(actualizado)
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setBusy(null)
    }
  }

  return { busy, error, run }
}
