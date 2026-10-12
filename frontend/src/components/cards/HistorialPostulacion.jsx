import { formatDate } from '../../lib/perfil'
import EstadoBadge from './EstadoBadge'

// Línea de tiempo de una postulación: cada cambio de estado, quién lo hizo y cuándo.
export default function HistorialPostulacion({ historial = [] }) {
  if (historial.length === 0) return null
  return (
    <details className="group">
      <summary className="w-fit cursor-pointer list-none font-body text-xs font-semibold text-muted hover:text-ink">
        <span className="group-open:hidden">Ver historial ({historial.length})</span>
        <span className="hidden group-open:inline">Ocultar historial</span>
      </summary>
      <ol className="mt-3 flex flex-col gap-3 border-l border-line pl-4">
        {historial.map((m, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-cocoa" />
            <div className="flex flex-wrap items-center gap-2">
              <EstadoBadge estado={m.estado} />
              <span className="font-body text-xs text-muted">
                {formatDate(m.fecha)}
                {m.por && ` · ${m.por}`}
              </span>
            </div>
            {m.nota && <p className="mt-1 font-body text-xs italic text-muted">“{m.nota}”</p>}
          </li>
        ))}
      </ol>
    </details>
  )
}
