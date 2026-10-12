import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, FileCheck2, TriangleAlert, UserRound } from 'lucide-react'
import ListState from '../components/layout/ListState'
import PageTitle from '../components/layout/PageTitle'
import { Pill } from '../components/seguimiento/ui'
import { useAuth } from '../context/auth'
import useFetch from '../hooks/useFetch'
import { initials } from '../lib/perfil'
import { ESTADO_SEGUIMIENTO, porcentajeHoras } from '../lib/seguimiento'
import { getSeguimientos } from '../services/api'

const SUBTITULO = {
  empresa: 'Tus practicantes: valida sus horas y firma sus documentos.',
  asesor_academico: 'Los estudiantes que asesoras: revisa su avance y firma sus documentos.',
  coordinador: 'Todas las estadías en curso y concluidas.',
}

const FILTROS = [{ id: 'todas', label: 'Todas' }, ...Object.entries(ESTADO_SEGUIMIENTO).map(([id, e]) => ({ id, label: e.label }))]

export default function Seguimientos() {
  const { usuario } = useAuth()
  const { data, error, loading } = useFetch(() => getSeguimientos(), [])
  const [filtro, setFiltro] = useState('todas')
  const todos = data ?? []
  const visibles = filtro === 'todas' ? todos : todos.filter((s) => s.estado === filtro)

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle title="Seguimiento de estadías" subtitle={SUBTITULO[usuario.rol]} />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por estado">
        {FILTROS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filtro === id}
            onClick={() => setFiltro(id)}
            className={`rounded-full border px-4 py-1.5 font-body text-xs font-medium transition-colors ${
              filtro === id ? 'border-cocoa bg-cocoa text-on-cocoa' : 'border-line bg-surface text-muted hover:text-ink'
            }`}
          >
            {label} <span className="opacity-70">{id === 'todas' ? todos.length : todos.filter((s) => s.estado === id).length}</span>
          </button>
        ))}
      </div>

      <ListState
        loading={loading}
        error={error}
        empty={!loading && !error && visibles.length === 0}
        emptyText={todos.length === 0 ? 'Aún no hay estadías que seguir.' : 'No hay estadías con ese estado.'}
      />

      <ul className="flex flex-col gap-4">
        {visibles.map((s) => {
          const pct = porcentajeHoras(s)
          return (
            <li key={s.id}>
              <Link to={`/seguimientos/${s.id}`} className="card flex flex-col gap-4 p-5 transition-colors hover:border-cocoa/40 lg:flex-row lg:items-center">
                <span className="tile flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-body text-sm font-semibold">
                  {initials(s.estudiante_nombre)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-body text-base font-semibold text-ink">{s.estudiante_nombre}</span>
                    {s.matricula && <span className="font-body text-xs text-muted">{s.matricula}</span>}
                    <Pill estado={s.estado} mapa={ESTADO_SEGUIMIENTO} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-cocoa" />
                      {s.organizacion_nombre}
                      {s.vacante_titulo && ` · ${s.vacante_titulo}`}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5 text-cocoa" />
                      {s.asesor_academico_nombre || 'Sin asesor académico'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileCheck2 className="h-3.5 w-3.5 text-cocoa" />
                      {s.documentos_completos}/{s.documentos.length} documentos
                    </span>
                    {s.incidencias_abiertas > 0 && (
                      <span className="flex items-center gap-1.5 text-brand">
                        <TriangleAlert className="h-3.5 w-3.5" />
                        {s.incidencias_abiertas} incidencia{s.incidencias_abiertas > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full lg:w-56">
                  <div className="flex justify-between font-body text-xs text-muted">
                    <span>
                      {s.horas_validadas}/{s.horas_requeridas} h
                    </span>
                    <span className="font-semibold text-ink">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-gradient-to-r from-cocoa to-caramel" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
