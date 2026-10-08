import { Clock, MapPin } from 'lucide-react'
import MatchBadge from './MatchBadge'

const estados = {
  activo: 'Disponible',
  en_proceso: 'En proceso',
  colocado: 'Colocado',
}

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function StudentCard({ student, matchPercentage }) {
  const { nombre, carrera, semestre, ubicacion, skills, estado, disponibilidad } = student

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand/40">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft font-body text-sm font-semibold text-brand">
          {initials(nombre)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-body text-sm font-semibold text-ink">{nombre}</h3>
          <p className="truncate font-body text-xs text-muted">
            {carrera} · {semestre}º semestre
          </p>
        </div>
        <MatchBadge percentage={matchPercentage} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {ubicacion?.zona}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {disponibilidad?.horas_por_semana ?? '-'} hrs/semana
        </span>
      </div>

      {skills?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-md border border-line bg-canvas px-2.5 py-1 font-body text-xs text-muted"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
        <span className="flex items-center gap-1.5 font-body text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${estado === 'activo' ? 'bg-emerald-500' : 'bg-muted'}`} />
          {estados[estado] ?? estado}
        </span>
        <button
          type="button"
          title="Próximamente"
          className="rounded-lg bg-brand px-4 py-2 font-body text-xs font-semibold text-on-brand transition-opacity hover:opacity-90"
        >
          Contactar
        </button>
      </div>
    </article>
  )
}
