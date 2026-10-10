import { useEffect, useState } from 'react'
import VacancyCard from '../components/cards/VacancyCard'
import ListState from '../components/layout/ListState'
import useStoredSet from '../hooks/useStoredSet'
import { getVacancies } from '../services/api'

export default function Guardados() {
  const [vacancies, setVacancies] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, toggleSaved] = useStoredSet('linkea-saved')

  useEffect(() => {
    getVacancies()
      .then(setVacancies)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const items = vacancies.filter((v) => saved.has(v.id))

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-4xl font-medium">Guardados</h1>
        <p className="mt-2 font-body text-sm text-muted">Las vacantes que marcaste para revisar después.</p>
      </header>

      <ListState
        loading={loading}
        error={error}
        empty={!loading && !error && items.length === 0}
        emptyText="Aún no has guardado ninguna vacante."
        actionTo="/vacantes"
        actionLabel="Explorar vacantes"
      />

      {!loading && !error && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((vacancy) => (
            <VacancyCard
              key={vacancy.id}
              vacancy={vacancy}
              saved
              onToggleSave={() => toggleSaved(vacancy.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
