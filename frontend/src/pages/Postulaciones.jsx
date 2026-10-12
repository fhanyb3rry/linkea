import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin } from 'lucide-react'
import EstadoBadge from '../components/cards/EstadoBadge'
import HistorialPostulacion from '../components/cards/HistorialPostulacion'
import MatchBadge from '../components/cards/MatchBadge'
import ListState from '../components/layout/ListState'
import NeedsProfile from '../components/layout/NeedsProfile'
import PageTitle from '../components/layout/PageTitle'
import useActiveStudent from '../hooks/useActiveStudent'
import useFetch from '../hooks/useFetch'
import useMatches from '../hooks/useMatches'
import { areaInfo } from '../lib/areas'
import { ESTADOS, RETIRABLES } from '../lib/estados'
import { formatDate } from '../lib/perfil'
import { deleteApplication, getApplications, getVacancies } from '../services/api'

const FILTROS = [{ id: 'todas', label: 'Todas' }, ...Object.entries(ESTADOS).map(([id, e]) => ({ id, label: e.label }))]

export default function Postulaciones() {
  const [studentId] = useActiveStudent()
  const [filtro, setFiltro] = useState('todas')
  const [confirmId, setConfirmId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const matches = useMatches(studentId)

  const { data, error, loading, reload } = useFetch(
    () => Promise.all([getApplications({ studentId }), getVacancies()]),
    [studentId],
    Boolean(studentId),
  )

  const rows = useMemo(() => {
    if (!data) return []
    const [applications, vacancies] = data
    const byId = new Map(vacancies.map((v) => [v.id, v]))
    // si la vacante ya no existe, la postulación se oculta (el backend las borra con la vacante)
    return applications.map((a) => ({ ...a, vacancy: byId.get(a.vacancy_id) })).filter((r) => r.vacancy)
  }, [data])

  const counts = useMemo(() => {
    const c = { todas: rows.length }
    for (const r of rows) c[r.estado] = (c[r.estado] ?? 0) + 1
    return c
  }, [rows])

  const visible = filtro === 'todas' ? rows : rows.filter((r) => r.estado === filtro)

  async function retirar(id) {
    setActionError(null)
    try {
      await deleteApplication(id)
      setConfirmId(null)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle
        title="Postulaciones"
        subtitle="Las vacantes a las que te postulaste y el estado de cada una."
      >
        <Link
          to="/vacantes"
          className="rounded-lg bg-brand px-5 py-3 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
        >
          Explorar vacantes
        </Link>
      </PageTitle>

      {!studentId && <NeedsProfile text="Crea tu perfil para postularte y ver aquí tus postulaciones." />}

      {studentId && (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por estado">
            {FILTROS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filtro === id}
                onClick={() => setFiltro(id)}
                className={`rounded-full border px-4 py-1.5 font-body text-xs font-medium transition-colors ${
                  filtro === id
                    ? 'border-cocoa bg-cocoa text-on-cocoa'
                    : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                {label} <span className="opacity-70">{counts[id] ?? 0}</span>
              </button>
            ))}
          </div>

          <ListState
            loading={loading}
            error={error}
            empty={!loading && !error && visible.length === 0}
            emptyText={
              rows.length === 0
                ? 'Todavía no te has postulado a ninguna vacante.'
                : 'No hay postulaciones con ese estado.'
            }
            actionTo={rows.length === 0 ? '/vacantes' : undefined}
            actionLabel="Explorar vacantes"
          />

          {actionError && <p className="font-body text-sm text-red-600">{actionError}</p>}

          <ul className="flex flex-col gap-4">
            {visible.map(({ id, vacancy, estado, creada_en, mensaje, historial }) => {
              const area = areaInfo(vacancy.sector)
              const AreaIcon = area.icon
              return (
                <li key={id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <span className="tile flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-heading text-base font-semibold">
                    {vacancy.nombre_empresa.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-body text-base font-semibold text-ink">
                        {vacancy.titulo || vacancy.nombre_empresa}
                      </h2>
                      {vacancy.titulo && <span className="font-body text-xs text-muted">{vacancy.nombre_empresa}</span>}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-cocoa-soft px-2.5 py-0.5 font-body text-[11px] font-medium text-cocoa">
                        <AreaIcon className="h-3 w-3" />
                        {area.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-cocoa" />
                        {vacancy.ubicacion.zona}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-cocoa" />
                        {vacancy.horarios.horas_por_semana} hrs/semana
                      </span>
                      <span>Enviada el {formatDate(creada_en)}</span>
                    </div>
                    {mensaje && <p className="mt-2 line-clamp-2 font-body text-xs italic text-muted">“{mensaje}”</p>}
                    <div className="mt-2">
                      <HistorialPostulacion historial={historial} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <MatchBadge match={matches.get(vacancy.id)} />
                    <EstadoBadge estado={estado} />
                    {confirmId === id ? (
                      <span className="flex items-center gap-2 font-body text-xs text-ink">
                        ¿Retirar?
                        <button
                          type="button"
                          onClick={() => retirar(id)}
                          className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-on-brand"
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="rounded-lg border border-line px-3 py-1.5 font-semibold"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <>
                        <Link
                          to={`/vacantes/${vacancy.id}`}
                          className="rounded-lg border border-line bg-surface px-3 py-2 font-body text-xs font-semibold text-ink hover:border-cocoa/50"
                        >
                          Ver vacante
                        </Link>
                        {RETIRABLES.includes(estado) && (
                          <button
                            type="button"
                            onClick={() => setConfirmId(id)}
                            className="rounded-lg px-3 py-2 font-body text-xs font-semibold text-muted hover:text-brand"
                          >
                            Retirar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
