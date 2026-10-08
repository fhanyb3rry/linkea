import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import StudentCard from '../components/cards/StudentCard'
import { getStudents } from '../services/api'

export default function Estudiantes() {
  const [students, setStudents] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Estudiantes</h1>
        <Link
          to="/perfil/crear"
          className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 font-body text-sm font-semibold text-on-brand transition-all hover:scale-[1.03] hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Crear perfil
        </Link>
      </div>

      {loading && <p className="mt-4 font-body text-sm text-muted">Cargando estudiantes...</p>}
      {error && <p className="mt-4 font-body text-sm text-red-600">{error}</p>}
      {!loading && !error && students.length === 0 && (
        <p className="mt-4 font-body text-sm text-muted">Aún no hay estudiantes registrados.</p>
      )}

      <div className="mt-6 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {students.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
    </section>
  )
}
