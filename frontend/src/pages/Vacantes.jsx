import { useEffect, useMemo, useState } from 'react'
import VacancyCard from '../components/cards/VacancyCard'
import ListState from '../components/layout/ListState'
import PageHeader from '../components/layout/PageHeader'
import { getVacancies } from '../services/api'

export default function Vacantes() {
  const [vacancies, setVacancies] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('Todos')

  useEffect(() => {
    getVacancies()
      .then(setVacancies)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const sectors = useMemo(() => ['Todos', ...new Set(vacancies.map((v) => v.sector))], [vacancies])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vacancies.filter((v) => {
      if (sector !== 'Todos' && v.sector !== sector) return false
      if (!q) return true
      const text = [v.nombre_empresa, v.sector, v.ubicacion?.zona, ...(v.requisitos?.skills_clave ?? [])]
        .join(' ')
        .toLowerCase()
      return text.includes(q)
    })
  }, [vacancies, search, sector])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Vacantes"
        subtitle="Prácticas profesionales publicadas por empresas."
        count={loading || error ? undefined : vacancies.length}
        actionTo="/vacantes/nueva"
        actionLabel="Publicar vacante"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar por empresa, sector, zona o skill..."
      />

      {sectors.length > 2 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por sector">
          {sectors.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === sector}
              onClick={() => setSector(s)}
              className={`rounded-full border px-4 py-1.5 font-body text-xs font-medium transition-colors ${
                s === sector
                  ? 'border-brand bg-brand text-on-brand'
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
        actionTo={vacancies.length === 0 ? '/vacantes/nueva' : undefined}
        actionLabel="Publicar la primera vacante"
      />

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((vacancy) => (
            <VacancyCard key={vacancy.id} vacancy={vacancy} />
          ))}
        </div>
      )}
    </section>
  )
}
