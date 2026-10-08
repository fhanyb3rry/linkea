import { useEffect, useMemo, useState } from 'react'
import StudentCard from '../components/cards/StudentCard'
import ListState from '../components/layout/ListState'
import PageHeader from '../components/layout/PageHeader'
import { getStudents } from '../services/api'

export default function Estudiantes() {
  const [students, setStudents] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [carrera, setCarrera] = useState('Todas')

  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const carreras = useMemo(() => ['Todas', ...new Set(students.map((s) => s.carrera))], [students])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (carrera !== 'Todas' && s.carrera !== carrera) return false
      if (!q) return true
      const text = [s.nombre, s.carrera, s.ubicacion?.zona, ...(s.skills ?? [])].join(' ').toLowerCase()
      return text.includes(q)
    })
  }, [students, search, carrera])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Estudiantes"
        subtitle="Perfiles de estudiantes que buscan una práctica profesional."
        count={loading || error ? undefined : students.length}
        actionTo="/perfil/crear"
        actionLabel="Crear perfil"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar por nombre, carrera, zona o skill..."
      />

      {carreras.length > 2 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por carrera">
          {carreras.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={c === carrera}
              onClick={() => setCarrera(c)}
              className={`rounded-full border px-4 py-1.5 font-body text-xs font-medium transition-colors ${
                c === carrera
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <ListState
        loading={loading}
        error={error}
        empty={!loading && !error && filtered.length === 0}
        emptyText={
          students.length === 0
            ? 'Aún no hay estudiantes registrados.'
            : 'Ningún estudiante coincide con tu búsqueda.'
        }
        actionTo={students.length === 0 ? '/perfil/crear' : undefined}
        actionLabel="Crear el primer perfil"
      />

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}
    </section>
  )
}
