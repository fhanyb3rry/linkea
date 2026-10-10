import { useEffect, useState } from 'react'
import { getRecommendations } from '../services/api'

const EMPTY = new Map()

// Compatibilidad real (la calcula el backend) del estudiante activo con cada vacante.
// Devuelve un Map: vacancyId -> { compatibilidad, elegible, razones_descarte, ... }.
export default function useMatches(studentId) {
  const [state, setState] = useState({ key: '', map: EMPTY })

  useEffect(() => {
    if (!studentId) return undefined
    let cancelled = false

    getRecommendations(studentId)
      .then((accion) => {
        if (cancelled) return
        const map = new Map()
        for (const d of [...accion.recomendadas, ...accion.descartadas]) map.set(d.vacante_id, d)
        setState({ key: studentId, map })
      })
      .catch(() => {
        // sin respuesta del backend: las tarjetas simplemente no muestran porcentaje
        if (!cancelled) setState({ key: studentId, map: EMPTY })
      })

    return () => {
      cancelled = true
    }
  }, [studentId])

  return studentId && state.key === studentId ? state.map : EMPTY
}
