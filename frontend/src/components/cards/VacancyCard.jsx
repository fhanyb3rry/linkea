import { Link } from 'react-router-dom'
import { Bookmark, Clock, MapPin } from 'lucide-react'
import MatchBadge from './MatchBadge'

export default function VacancyCard({ vacancy, matchPercentage }) {
  const { id, nombre_empresa, sector, ubicacion, requisitos, estipendio, horarios } = vacancy

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-brand/40">
      <div className="relative h-24 bg-night">
        <div className="absolute -right-6 -top-10 h-32 w-32 rounded-full bg-brand/70 blur-2xl" />
        <span className="absolute bottom-0 left-5 flex h-12 w-12 translate-y-1/2 items-center justify-center rounded-xl border-4 border-surface bg-brand font-body text-sm font-bold text-on-brand">
          {nombre_empresa.slice(0, 2).toUpperCase()}
        </span>
        <span
          title="Guardar (próximamente)"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-on-brand backdrop-blur"
        >
          <Bookmark className="h-4 w-4" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 pt-9">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-body text-base font-semibold text-ink">{nombre_empresa}</h3>
            <p className="font-body text-xs font-medium text-brand">{sector}</p>
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
            {horarios?.horas_por_semana ?? '-'} hrs/semana
          </span>
        </div>

        {requisitos?.skills_clave?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {requisitos.skills_clave.map((skill) => (
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
          <span className="font-body text-xs text-muted">
            {estipendio?.apoyo_economico ? `$${estipendio.monto} ${estipendio.moneda}` : 'Sin apoyo económico'}
          </span>
          <Link
            to={`/vacantes/${id}`}
            className="rounded-lg bg-brand px-4 py-2 font-body text-xs font-semibold text-on-brand transition-opacity hover:opacity-90"
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  )
}
