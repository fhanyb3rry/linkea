import { Link } from 'react-router-dom'
import { ArrowUpRight, Bookmark, Clock, MapPin } from 'lucide-react'
import { areaInfo } from '../../lib/areas'
import MatchBadge from './MatchBadge'

const MAX_SKILLS = 4

function Meta({ icon: Icon, children }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-cocoa" />
      {children}
    </span>
  )
}

export default function VacancyCard({ vacancy, match, saved = false, onToggleSave }) {
  const { id, titulo, nombre_empresa, sector, ubicacion, requisitos, estipendio, horarios, ejemplo } = vacancy
  const area = areaInfo(sector)
  const AreaIcon = area.icon
  const skills = requisitos?.skills_clave ?? []
  const to = ejemplo ? '/vacantes' : `/vacantes/${id}`

  return (
    <article className="card group flex h-full flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="tile flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-heading text-base font-semibold">
          {nombre_empresa.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-body text-base font-semibold text-ink">
            {/* el enlace cubre toda la tarjeta; el botón de guardar queda por encima */}
            <Link to={to} className="after:absolute after:inset-0 focus-visible:outline-none">
              {titulo || nombre_empresa}
            </Link>
          </h3>
          {titulo && <p className="truncate font-body text-xs text-muted">{nombre_empresa}</p>}
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-cocoa-soft px-2.5 py-0.5 font-body text-[11px] font-medium text-cocoa">
            <AreaIcon className="h-3 w-3" />
            {area.label}
          </span>
        </div>
        {onToggleSave && (
        <button
          type="button"
          aria-label={saved ? 'Quitar de guardados' : 'Guardar vacante'}
          aria-pressed={saved}
          onClick={onToggleSave}
          className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] duration-200 hover:scale-105 active:scale-95 ${
            saved
              ? 'border-cocoa/40 bg-cocoa-soft text-cocoa'
              : 'border-line bg-surface text-muted hover:border-cocoa/40 hover:text-cocoa'
          }`}
        >
          <Bookmark key={String(saved)} className={`h-4 w-4 ${saved ? 'animate-pop fill-current' : ''}`} />
        </button>
        )}
      </div>

      {sector && sector !== area.label && (
        <p className="-mt-2 font-body text-xs text-muted">{sector}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-2 font-body text-xs text-muted">
        <Meta icon={MapPin}>{ubicacion?.zona}</Meta>
        <Meta icon={Clock}>{horarios?.horas_por_semana ?? '-'} hrs/semana</Meta>
        {match && (
          <span className="ml-auto">
            <MatchBadge match={match} />
          </span>
        )}
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
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 font-body text-xs font-medium ${
              estipendio?.apoyo_economico ? 'bg-teal/20 text-ink' : 'bg-canvas text-muted'
            }`}
          >
            {estipendio?.apoyo_economico ? `$${estipendio.monto} ${estipendio.moneda}` : 'Sin apoyo'}
          </span>
        </div>
        <span className="flex items-center gap-1 font-body text-xs font-semibold text-cocoa">
          Ver detalle
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  )
}
