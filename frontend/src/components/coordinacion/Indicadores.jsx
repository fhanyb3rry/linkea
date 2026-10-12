import { Link } from 'react-router-dom'
import { Briefcase, Building2, CalendarCheck, Clock, GraduationCap, TriangleAlert, UserRound, UserX } from 'lucide-react'
import useFetch from '../../hooks/useFetch'
import { ESTADOS } from '../../lib/estados'
import { ESTADO_SEGUIMIENTO } from '../../lib/seguimiento'
import { getIndicadores } from '../../services/api'
import ListState from '../layout/ListState'
import { Seccion } from '../seguimiento/ui'

const ESTADO_ESTUDIANTE = { activo: 'Buscando', en_proceso: 'En proceso', colocado: 'Con estadía' }

function Stat({ icon: Icon, label, value, to }) {
  const contenido = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cocoa-soft text-cocoa">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-heading text-2xl text-ink">{value}</p>
        <p className="font-body text-xs text-muted">{label}</p>
      </div>
    </>
  )
  const clase = 'card flex items-center gap-4 p-5'
  return to ? (
    <Link to={to} className={`${clase} transition-colors hover:border-cocoa/40`}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  )
}

// Lista "etiqueta — número" para los conteos agrupados.
function Conteos({ items }) {
  if (items.length === 0) return <p className="font-body text-sm text-muted">Sin datos todavía.</p>
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map(([label, n]) => (
        <li key={label} className="flex items-center justify-between py-2 font-body text-sm">
          <span className="text-ink">{label}</span>
          <span className="font-semibold text-ink">{n}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Indicadores() {
  const { data: i, error, loading } = useFetch(() => getIndicadores(), [])
  if (!i) return <ListState loading={loading} error={error} />

  const enCurso = i.estadias_por_estado.en_curso ?? 0
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={GraduationCap} label="Estudiantes" value={i.estudiantes} to="/estudiantes" />
        <Stat icon={Building2} label="Organizaciones" value={i.organizaciones} to="/organizaciones" />
        <Stat icon={Briefcase} label="Vacantes" value={i.vacantes} to="/vacantes" />
        <Stat icon={CalendarCheck} label="Estadías en curso" value={enCurso} to="/seguimientos" />
        <Stat icon={Clock} label="Horas validadas en promedio" value={i.horas_promedio} />
        <Stat icon={TriangleAlert} label="Incidencias abiertas" value={i.incidencias_abiertas} />
        <Stat icon={UserRound} label="Estadías sin asesor" value={i.estadias_sin_asesor} />
        <Stat icon={UserX} label="Estudiantes sin postularse" value={i.estudiantes_sin_postular} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Seccion title="Estudiantes">
          <Conteos items={Object.entries(i.estudiantes_por_estado).map(([k, n]) => [ESTADO_ESTUDIANTE[k] ?? k, n])} />
        </Seccion>
        <Seccion title="Postulaciones">
          <Conteos items={Object.entries(i.postulaciones_por_estado).map(([k, n]) => [ESTADOS[k]?.label ?? k, n])} />
        </Seccion>
        <Seccion title="Estadías">
          <Conteos items={Object.entries(i.estadias_por_estado).map(([k, n]) => [ESTADO_SEGUIMIENTO[k]?.label ?? k, n])} />
        </Seccion>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion title="Documentos por completar" description="En estadías en curso, agrupados por documento.">
          <Conteos items={i.documentos_pendientes.map((d) => [d.nombre, d.pendientes])} />
        </Seccion>
        <Seccion title="Organizaciones" description="Vacantes publicadas y postulaciones recibidas.">
          {i.organizaciones_detalle.length === 0 ? (
            <p className="font-body text-sm text-muted">Sin organizaciones todavía.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {i.organizaciones_detalle.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2 font-body text-sm">
                  <Link to={`/organizaciones/${o.id}`} className="truncate text-ink hover:text-brand">
                    {o.nombre}
                  </Link>
                  <span className="shrink-0 text-xs text-muted">
                    {o.vacantes} vac. · {o.postulaciones} post.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      </div>
    </div>
  )
}
