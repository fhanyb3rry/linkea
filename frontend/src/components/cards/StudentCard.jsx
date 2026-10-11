import { Link } from 'react-router-dom'
import { Check, MapPin } from 'lucide-react'
import MatchBadge from './MatchBadge'

const estados = {
  activo: { label: 'Disponible', dot: 'bg-teal' },
  en_proceso: { label: 'En proceso', dot: 'bg-accent' },
  colocado: { label: 'Colocado', dot: 'bg-muted' },
}

const MAX_SKILLS = 4
const MAX_HORAS = 40

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function StudentCard({ student, match, connected = false, onToggleConnect }) {
  const { nombre, carrera, semestre, ubicacion, skills = [], estado, disponibilidad } = student
  const horas = disponibilidad?.horas_por_semana ?? 0
  const status = estados[estado] ?? { label: estado, dot: 'bg-muted' }

  return (
    <article className="card group flex h-full flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="relative shrink-0">
          <span className="tile flex h-12 w-12 items-center justify-center rounded-full font-body text-sm font-semibold">
            {initials(nombre)}
          </span>
          <span
            title={status.label}
            className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-2 ring-surface ${status.dot}`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-body text-base font-semibold text-ink">
            {/* el enlace cubre toda la tarjeta; el botón Conectar queda por encima */}
            <Link to={`/estudiantes/${student.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {nombre}
            </Link>
          </h3>
          <p className="truncate font-body text-xs text-muted">
            {carrera} · {semestre}º semestre
          </p>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between font-body text-xs">
          <span className="text-muted">Disponibilidad</span>
          <span className="font-semibold text-ink">{horas} hrs/semana</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cocoa to-caramel"
            style={{ width: `${Math.min(100, (horas / MAX_HORAS) * 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-body text-xs text-muted">
          <MapPin className="h-3.5 w-3.5 text-cocoa" />
          {ubicacion?.zona}
        </p>
        <MatchBadge match={match} />
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.slice(0, MAX_SKILLS).map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-line bg-canvas px-2.5 py-1 font-body text-xs text-muted transition-colors group-hover:border-cocoa/25"
            >
              {skill}
            </span>
          ))}
          {skills.length > MAX_SKILLS && (
            <span className="rounded-full px-1.5 py-1 font-body text-xs text-muted">+{skills.length - MAX_SKILLS}</span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
        <span className="flex items-center gap-1.5 font-body text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <button
          type="button"
          aria-pressed={connected}
          onClick={onToggleConnect}
          className={`relative z-10 flex items-center gap-1.5 rounded-lg px-4 py-2 font-body text-xs font-semibold transition-[background-color,color,border-color,transform,opacity] duration-200 hover:scale-105 active:scale-95 ${
            connected ? 'border border-cocoa bg-cocoa-soft text-cocoa' : 'bg-cocoa text-on-cocoa hover:opacity-90'
          }`}
        >
          {connected && <Check className="animate-pop h-3.5 w-3.5" />}
          {connected ? 'Conectado' : 'Conectar'}
        </button>
      </div>
    </article>
  )
}
