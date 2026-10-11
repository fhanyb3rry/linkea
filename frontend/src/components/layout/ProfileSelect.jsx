import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import useActiveStudent from '../../hooks/useActiveStudent'
import { getStudents } from '../../services/api'

// Selector del perfil con el que se calculan los porcentajes de compatibilidad.
export default function ProfileSelect() {
  const [students, setStudents] = useState([])
  const [activeId, setActiveId] = useActiveStudent()

  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch(() => setStudents([]))
  }, [])

  return (
    <label className="hidden items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-3 pr-2 font-body text-xs text-muted md:flex">
      <UserRound className="h-4 w-4 text-cocoa" />
      <span className="sr-only">Perfil activo</span>
      <select
        value={activeId}
        onChange={(e) => setActiveId(e.target.value)}
        title="El perfil con el que se calcula tu compatibilidad"
        className="max-w-40 cursor-pointer bg-transparent font-medium text-ink outline-none"
      >
        <option value="">Ver como…</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}
