import { useEffect, useMemo, useState } from 'react'
import StudentCard from '../components/cards/StudentCard'
import ListState from '../components/layout/ListState'
import PageHeader from '../components/layout/PageHeader'
import { useAuth } from '../context/auth'
import useStoredSet from '../hooks/useStoredSet'
import { getCandidates, getStudents, getVacancies } from '../services/api'

export default function Estudiantes() {
  const { usuario } = useAuth()
  // Solo un estudiante que aún no tiene perfil ve el botón para crearlo.
  const crearPerfil = usuario?.rol === 'estudiante' && !usuario.perfil_id ? '/perfil/crear' : undefined
  const [students, setStudents] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [connections, toggleConnection] = useStoredSet('linkea-connections')
  const [carrera, setCarrera] = useState('Todas')
  const [vacancies, setVacancies] = useState([])
  const [refVacancy, setRefVacancy] = useState('')
  const [candidates, setCandidates] = useState({ key: '', map: new Map() })

  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    getVacancies()
      .then(setVacancies)
      .catch(() => setVacancies([]))
  }, [])

  // Compatibilidad de cada estudiante con la vacante de referencia (la calcula el backend)
  useEffect(() => {
    if (!refVacancy) return undefined
    let cancelled = false
    getCandidates(refVacancy)
      .then((list) => {
        if (!cancelled) setCandidates({ key: refVacancy, map: new Map(list.map((c) => [c.estudiante_id, c])) })
      })
      .catch(() => !cancelled && setCandidates({ key: refVacancy, map: new Map() }))
    return () => {
      cancelled = true
    }
  }, [refVacancy])

  const matches = refVacancy && candidates.key === refVacancy ? candidates.map : null

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

  const sorted = useMemo(() => {
    if (!matches || matches.size === 0) return filtered
    const score = (s) => matches.get(s.id)?.compatibilidad ?? -1
    return [...filtered].sort((a, b) => score(b) - score(a))
  }, [filtered, matches])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Estudiantes"
        subtitle="Perfiles de estudiantes que buscan una práctica profesional."
        count={loading || error ? undefined : students.length}
        actionTo={crearPerfil}
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
                  ? 'border-cocoa bg-cocoa text-on-cocoa'
                  : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {vacancies.length > 0 && (
        <label className="flex flex-wrap items-center gap-2 font-body text-xs text-muted">
          Ver compatibilidad con la vacante
          <select
            value={refVacancy}
            onChange={(e) => setRefVacancy(e.target.value)}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-cocoa/30"
          >
            <option value="">Ninguna</option>
            {vacancies.map((v) => (
              <option key={v.id} value={v.id}>
                {v.titulo || v.sector} · {v.nombre_empresa}
              </option>
            ))}
          </select>
        </label>
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
        actionTo={students.length === 0 ? crearPerfil : undefined}
        actionLabel="Crear el primer perfil"
      />

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              match={matches?.get(student.id)}
              connected={connections.has(student.id)}
              onToggleConnect={() => toggleConnection(student.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
