import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import VacancyCard from '../components/cards/VacancyCard'
import ListState from '../components/layout/ListState'
import PageHeader from '../components/layout/PageHeader'
import { useAuth } from '../context/auth'
import useActiveStudent from '../hooks/useActiveStudent'
import useMatches from '../hooks/useMatches'
import useStoredSet from '../hooks/useStoredSet'
import { areaInfo } from '../lib/areas'
import { getVacancies } from '../services/api'

export default function Vacantes() {
  const [vacancies, setVacancies] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [saved, toggleSaved] = useStoredSet('linkea-saved')
  const [activeStudent] = useActiveStudent()
  const esEmpresa = useAuth().usuario?.rol === 'empresa'
  const matches = useMatches(activeStudent)
  const [sector, setSector] = useState('Todas')

  useEffect(() => {
    getVacancies()
      .then(setVacancies)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Filtro por área profesional (la misma clasificación del inicio), solo con las áreas que tienen vacantes
  const sectors = useMemo(() => ['Todas', ...new Set(vacancies.map((v) => areaInfo(v.sector).label))], [vacancies])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vacancies.filter((v) => {
      if (sector !== 'Todas' && areaInfo(v.sector).label !== sector) return false
      if (!q) return true
      const text = [v.nombre_empresa, v.sector, v.ubicacion?.zona, ...(v.requisitos?.skills_clave ?? [])]
        .join(' ')
        .toLowerCase()
      return text.includes(q)
    })
  }, [vacancies, search, sector])

  // Con un perfil activo, las vacantes se ordenan de mayor a menor compatibilidad
  const sorted = useMemo(() => {
    if (matches.size === 0) return filtered
    const score = (v) => matches.get(v.id)?.compatibilidad ?? -1
    return [...filtered].sort((a, b) => score(b) - score(a))
  }, [filtered, matches])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Vacantes"
        subtitle={
          activeStudent
            ? 'Ordenadas por tu compatibilidad estimada.'
            : 'Prácticas profesionales publicadas por empresas. Con tu perfil de estudiante verás tu compatibilidad.'
        }
        count={loading || error ? undefined : vacancies.length}
        actionTo={esEmpresa ? '/vacantes/nueva' : undefined}
        actionLabel="Publicar vacante"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar por empresa, sector, zona o skill..."
      />

      {sectors.length > 2 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por área">
          {sectors.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === sector}
              onClick={() => setSector(s)}
              className={`rounded-full border px-4 py-1.5 font-body text-xs font-medium transition-colors ${
                s === sector
                  ? 'border-cocoa bg-cocoa text-on-cocoa'
                  : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <ListState
        loading={loading}
        error={error}
        empty={!loading && !error && filtered.length === 0}
        emptyText={
          vacancies.length === 0
            ? 'Aún no hay vacantes registradas.'
            : 'Ninguna vacante coincide con tu búsqueda.'
        }
        actionTo={esEmpresa && vacancies.length === 0 ? '/vacantes/nueva' : undefined}
        actionLabel="Publicar la primera vacante"
      />

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((vacancy) => (
            <VacancyCard
              key={vacancy.id}
              vacancy={vacancy}
              match={matches.get(vacancy.id)}
              saved={saved.has(vacancy.id)}
              onToggleSave={() => toggleSaved(vacancy.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
