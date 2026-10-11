import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Clock, FileCheck2, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react'
import ListState from '../components/layout/ListState'
import PageTitle from '../components/layout/PageTitle'
import useFetch from '../hooks/useFetch'
import { areaInfo } from '../lib/areas'
import { deleteVacancy, getApplications, getVacancies } from '../services/api'

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cocoa-soft text-cocoa">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-heading text-2xl text-ink">{value}</p>
        <p className="font-body text-xs text-muted">{label}</p>
      </div>
    </div>
  )
}

export default function PanelEmpresa() {
  const { data, error, loading, reload } = useFetch(() => Promise.all([getVacancies(), getApplications()]), [])
  const [confirmId, setConfirmId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const [vacancies, applications] = data ?? [[], []]

  const porVacante = useMemo(() => {
    const map = new Map()
    for (const a of applications) map.set(a.vacancy_id, [...(map.get(a.vacancy_id) ?? []), a])
    return map
  }, [applications])

  const pendientes = applications.filter((a) => a.estado === 'enviada').length
  const aceptadas = applications.filter((a) => a.estado === 'aceptada').length

  async function eliminar(id) {
    setActionError(null)
    try {
      await deleteVacancy(id)
      setConfirmId(null)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle
        title="Mi empresa"
        subtitle="Administra tus vacantes y revisa a quién se postula."
      >
        <Link
          to="/vacantes/nueva"
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-3 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Publicar vacante
        </Link>
      </PageTitle>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Briefcase} label="Vacantes publicadas" value={vacancies.length} />
        <Stat icon={Users} label="Postulaciones recibidas" value={applications.length} />
        <Stat icon={Clock} label="Por revisar" value={pendientes} />
        <Stat icon={FileCheck2} label="Aceptadas" value={aceptadas} />
      </div>

      <ListState
        loading={loading}
        error={error}
        empty={!loading && !error && vacancies.length === 0}
        emptyText="Aún no has publicado ninguna vacante."
        actionTo="/vacantes/nueva"
        actionLabel="Publicar la primera vacante"
      />

      {actionError && <p className="font-body text-sm text-red-600">{actionError}</p>}

      <ul className="flex flex-col gap-4">
        {vacancies.map((v) => {
          const area = areaInfo(v.sector)
          const AreaIcon = area.icon
          const recibidas = porVacante.get(v.id) ?? []
          const nuevas = recibidas.filter((a) => a.estado === 'enviada').length
          return (
            <li key={v.id} className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
              <span className="tile flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-heading text-base font-semibold">
                {v.nombre_empresa.slice(0, 2).toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/vacantes/${v.id}`}
                    className="truncate font-body text-base font-semibold text-ink hover:text-brand"
                  >
                    {v.nombre_empresa}
                  </Link>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cocoa-soft px-2.5 py-0.5 font-body text-[11px] font-medium text-cocoa">
                    <AreaIcon className="h-3 w-3" />
                    {area.label}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-cocoa" />
                    {v.ubicacion.zona}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-cocoa" />
                    {v.horarios.horas_por_semana} hrs/semana
                  </span>
                  <span>{v.requisitos.skills_clave.slice(0, 3).join(' · ')}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <span className="rounded-full border border-line bg-canvas px-3 py-1 font-body text-xs text-muted">
                  <strong className="text-ink">{recibidas.length}</strong> postulaciones
                  {nuevas > 0 && <span className="ml-1.5 rounded-full bg-brand px-1.5 text-[10px] text-on-brand">{nuevas} nuevas</span>}
                </span>

                {confirmId === v.id ? (
                  <span className="flex items-center gap-2 font-body text-xs text-ink">
                    ¿Eliminar vacante?
                    <button
                      type="button"
                      onClick={() => eliminar(v.id)}
                      className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-on-brand"
                    >
                      Sí, eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-line px-3 py-1.5 font-semibold"
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <>
                    <Link
                      to={`/vacantes/${v.id}/candidatos`}
                      className="flex items-center gap-1.5 rounded-lg bg-cocoa px-3.5 py-2 font-body text-xs font-semibold text-on-cocoa transition-opacity hover:opacity-90"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Candidatos
                    </Link>
                    <Link
                      to={`/vacantes/${v.id}/editar`}
                      className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 font-body text-xs font-semibold text-ink hover:border-cocoa/50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Link>
                    <button
                      type="button"
                      aria-label={`Eliminar vacante de ${v.nombre_empresa}`}
                      onClick={() => setConfirmId(v.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-brand"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
