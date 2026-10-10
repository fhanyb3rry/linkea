import { Check, X } from 'lucide-react'

// `match` viene del backend: { compatibilidad (0-100), elegible, razones_descarte }.
// Elegible = pasa el filtro de lógica proposicional; el porcentaje es una estimación por reglas.
export default function MatchBadge({ match }) {
  if (!match) return null

  const { compatibilidad, elegible, razones_descarte: razones = [] } = match

  if (elegible) {
    return (
      <span
        title="Cumples los requisitos · compatibilidad estimada"
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cocoa px-2.5 py-1 font-body text-[11px] font-semibold text-on-cocoa"
      >
        <Check className="h-3 w-3" />
        {compatibilidad}% match
      </span>
    )
  }

  return (
    <span
      title={razones.length ? razones.join(' · ') : 'No cumple los requisitos'}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-canvas px-2.5 py-1 font-body text-[11px] font-medium text-muted"
    >
      <X className="h-3 w-3" />
      No elegible · {compatibilidad}%
    </span>
  )
}
