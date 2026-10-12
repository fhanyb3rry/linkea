import { useState } from 'react'
import { Link } from 'react-router-dom'
import EstadoBadge from '../cards/EstadoBadge'
import useFetch from '../../hooks/useFetch'
import { ESTADOS } from '../../lib/estados'
import { formatDate } from '../../lib/perfil'
import { getPostulacionesCoordinacion } from '../../services/api'
import ListState from '../layout/ListState'

const FILTROS = [{ id: '', label: 'Todas' }, ...Object.entries(ESTADOS).map(([id, e]) => ({ id, label: e.label }))]

export default function PostulacionesTabla() {
  const [estado, setEstado] = useState('')
  const { data, error, loading } = useFetch(() => getPostulacionesCoordinacion(estado), [estado])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar postulaciones">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={estado === f.id}
            onClick={() => setEstado(f.id)}
            className={`rounded-full border px-4 py-1.5 font-body text-xs font-medium transition-colors ${
              estado === f.id ? 'border-cocoa bg-cocoa text-on-cocoa' : 'border-line bg-surface text-muted hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ListState loading={loading} error={error} empty={data?.length === 0} emptyText="No hay postulaciones con ese estado." />
      {data?.length > 0 && (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left font-body text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Estudiante</th>
                <th className="px-4 py-3 font-medium">Vacante</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link to={`/estudiantes/${p.student_id}`} className="font-semibold text-ink hover:text-brand">
                      {p.estudiante}
                    </Link>
                    <p className="text-xs text-muted">
                      {p.matricula} · {p.carrera}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/vacantes/${p.vacancy_id}`} className="text-ink hover:text-brand">
                      {p.vacante}
                    </Link>
                    <p className="text-xs text-muted">{p.empresa}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(p.creada_en)}</td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={p.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
