import { Link } from 'react-router-dom'
import useFetch from '../../hooks/useFetch'
import { formatDate } from '../../lib/perfil'
import { ESTADO_INCIDENCIA } from '../../lib/seguimiento'
import { getIncidenciasCoordinacion } from '../../services/api'
import ListState from '../layout/ListState'
import { Pill } from '../seguimiento/ui'

export default function IncidenciasLista() {
  const { data, error, loading } = useFetch(() => getIncidenciasCoordinacion(), [])
  return (
    <div className="flex flex-col gap-4">
      <ListState loading={loading} error={error} empty={data?.length === 0} emptyText="No hay incidencias reportadas." />
      <ul className="flex flex-col gap-3">
        {(data ?? []).map(({ seguimiento_id, estudiante, organizacion, incidencia: i }) => (
          <li key={i.id}>
            <Link to={`/seguimientos/${seguimiento_id}`} className="card flex flex-col gap-2 p-5 transition-colors hover:border-cocoa/40">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-body text-sm font-semibold text-ink">{i.tipo}</span>
                <Pill estado={i.estado} mapa={ESTADO_INCIDENCIA} />
                <span className="ml-auto font-body text-xs text-muted">{formatDate(i.fecha)}</span>
              </div>
              <p className="font-body text-xs text-muted">
                {estudiante} · {organizacion} · reportada por {i.reportada_por}
              </p>
              <p className="line-clamp-2 font-body text-sm text-ink">{i.descripcion}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
