import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, Check, X } from 'lucide-react'
import useActiveStudent from '../../hooks/useActiveStudent'
import { checkEligibility, getStudents } from '../../services/api'

// Proposiciones atómicas de la fórmula, en el orden en que se muestran.
const proposiciones = [
  { key: 'carrera_match', label: 'Carrera aceptada' },
  { key: 'skill_clave', label: 'Skill clave en común' },
  { key: 'disponibilidad_horaria', label: 'Horas disponibles suficientes' },
  { key: 'ubicacion_compatible', label: 'Ubicación compatible' },
]

export default function EligibilityPanel({ vacancyId }) {
  const [students, setStudents] = useState([])
  const [studentsError, setStudentsError] = useState(null)
  const [studentId, setStudentId] = useActiveStudent()
  // Resultado de la última consulta; `key` indica a qué par (estudiante, vacante) pertenece.
  const [outcome, setOutcome] = useState(null)

  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch((err) => setStudentsError(err.message))
  }, [])

  const key = `${studentId}:${vacancyId}`

  useEffect(() => {
    if (!studentId) return undefined
    let cancelled = false
    checkEligibility(studentId, vacancyId)
      .then((data) => !cancelled && setOutcome({ key, data }))
      .catch((err) => !cancelled && setOutcome({ key, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [studentId, vacancyId, key])

  function onSelect(event) {
    setStudentId(event.target.value)
  }

  const current = outcome?.key === key ? outcome : null
  const loading = Boolean(studentId) && !current
  const shown = current?.data ?? null
  const error = studentsError ?? current?.error ?? null

  return (
    <aside className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
      <div>
        <h2 className="text-xl">Tu compatibilidad</h2>
        <p className="mt-1 font-body text-xs text-muted">
          Dos filtros: elegibilidad con lógica proposicional y compatibilidad con IA.
        </p>
      </div>

      <div>
        <label htmlFor="student" className="mb-1.5 block font-body text-xs font-medium text-ink">
          Evaluar como
        </label>
        <select
          id="student"
          value={studentId}
          onChange={onSelect}
          className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 font-body text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">Selecciona un estudiante...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} · {s.carrera}
            </option>
          ))}
        </select>
        {students.length === 0 && !studentsError && (
          <p className="mt-2 font-body text-xs text-muted">
            Aún no hay estudiantes.{' '}
            <Link to="/perfil/crear" className="font-semibold text-brand hover:underline">
              Crea un perfil
            </Link>
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-brand-soft p-3 font-body text-xs text-ink">
          No se pudo evaluar: {error}
        </p>
      )}

      {loading && <div className="h-40 animate-pulse rounded-xl bg-canvas" aria-busy="true" />}

      {shown && !loading && (
        <>
          <div
            className={`flex items-center gap-3 rounded-xl p-4 ${
              shown.elegible ? 'bg-teal/20' : 'bg-brand-soft'
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                shown.elegible ? 'bg-teal text-white' : 'bg-brand text-on-brand'
              }`}
            >
              {shown.elegible ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </span>
            <div>
              <p className="font-body text-sm font-semibold text-ink">
                {shown.elegible ? 'Eres elegible' : 'No eres elegible'}
              </p>
              <p className="font-body text-xs text-muted">Filtro 1 · lógica proposicional</p>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between font-body text-xs">
              <span className="text-muted">Compatibilidad estimada</span>
              <span className="font-semibold text-ink">{shown.compatibilidad}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cocoa to-caramel"
                style={{ width: `${shown.compatibilidad}%` }}
              />
            </div>
            <p className="mt-1.5 font-body text-[11px] leading-snug text-muted">
              Calculada por reglas: carrera, skills, horas y zona. El análisis con IA llegará después.
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {proposiciones.map(({ key, label }) => {
              const ok = shown.proposiciones[key]
              return (
                <li key={key} className="flex items-center gap-2.5 font-body text-sm text-ink">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      ok ? 'bg-teal text-white' : 'bg-line text-muted'
                    }`}
                  >
                    {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                  {label}
                </li>
              )
            })}
          </ul>

          {shown.razones_descarte.length > 0 && (
            <div className="rounded-xl border border-line bg-canvas p-3">
              <p className="font-body text-xs font-semibold text-ink">Por qué no</p>
              <ul className="mt-1.5 list-disc pl-4 font-body text-xs leading-relaxed text-muted">
                {shown.razones_descarte.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-dashed border-line p-3">
        <Brain className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
        <div>
          <p className="font-body text-xs font-semibold text-ink">Filtro 2 · compatibilidad con IA</p>
          <p className="font-body text-xs text-muted">Próximamente.</p>
        </div>
      </div>
    </aside>
  )
}
