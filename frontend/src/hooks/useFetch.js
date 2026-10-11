import { useCallback, useEffect, useState } from 'react'

// Carga datos al montar (y cuando cambian `deps`). Devuelve { data, error, loading, reload }.
// Si `enabled` es false no consulta (por ejemplo, mientras falta un id).
export default function useFetch(fetcher, deps = [], enabled = true) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false })
      return undefined
    }
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((err) => !cancelled && setState({ data: null, error: err.message, loading: false }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
