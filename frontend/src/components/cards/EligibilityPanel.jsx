import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Brain, Check, MapPin, RefreshCcw, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { useAuth } from '../../context/auth'
import useActiveStudent from '../../hooks/useActiveStudent'
import { checkEligibility, getCompatibilidadIA, getStudents, getTrasladoPar } from '../../services/api'

// Proposiciones atómicas de la fórmula, en el orden en que se muestran.
const proposiciones = [
  { key: 'carrera_match', label: 'Carrera aceptada' },
  { key: 'skill_clave', label: 'Skill clave en común' },
  { key: 'disponibilidad_horaria', label: 'Horas disponibles suficientes' },
  { key: 'ubicacion_compatible', label: 'Ubicación compatible' },
]

// Filtro 2: la IA solo evalúa a quien pasó el filtro 1. Si la IA no está disponible, el backend
// responde con el porcentaje por reglas y un aviso (fuente: 'reglas').
function FiltroIA({ studentId, vacancyId, elegible }) {
  const [estado, setEstado] = useState({ key: '', data: null, error: null })
  const key = `${studentId}:${vacancyId}`
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!elegible) return undefined
    let cancelled = false
    getCompatibilidadIA(studentId, vacancyId, tick > 0)
      .then((data) => !cancelled && setEstado({ key, data, error: null }))
      .catch((err) => !cancelled && setEstado({ key, data: null, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [studentId, vacancyId, elegible, key, tick])

  const actual = estado.key === key ? estado : null
  const data = actual?.data
  const cargando = elegible && !actual

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-body text-xs font-semibold text-ink">
          <Brain className="h-4 w-4 text-cocoa" />
          Filtro 2 · compatibilidad con IA
        </p>
        {data?.fuente === 'ia' && (
          <button
            type="button"
            title="Volver a evaluar"
            onClick={() => {
              setEstado({ key: '', data: null, error: null })
              setTick((t) => t + 1)
            }}
            className="text-muted transition-colors hover:text-brand"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!elegible && (
        <p className="font-body text-xs text-muted">
          Se evalúa solo cuando pasas el filtro 1 (elegibilidad).
        </p>
      )}
      {cargando && <div className="h-24 animate-pulse rounded-lg bg-canvas" aria-busy="true" />}
      {actual?.error && <p className="font-body text-xs text-muted">No se pudo consultar: {actual.error}</p>}

      {data && (
        <>
          <div>
            <div className="mb-1.5 flex items-center justify-between font-body text-xs">
              <span className="text-muted">{data.fuente === 'ia' ? 'Compatibilidad con IA' : 'Compatibilidad estimada'}</span>
              <span className="font-semibold text-ink">{data.puntaje}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brand" style={{ width: `${data.puntaje}%` }} />
            </div>
          </div>
          {data.aviso && <p className="font-body text-[11px] leading-snug text-muted">{data.aviso}</p>}
          {data.resumen && <p className="font-body text-xs leading-relaxed text-ink">{data.resumen}</p>}
          {data.razones_a_favor.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {data.razones_a_favor.map((r) => (
                <li key={r} className="flex gap-2 font-body text-xs leading-snug text-ink">
                  <ThumbsUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                  {r}
                </li>
              ))}
            </ul>
          )}
          {data.razones_en_contra.length > 0 && data.fuente === 'ia' && (
            <ul className="flex flex-col gap-1.5">
              {data.razones_en_contra.map((r) => (
                <li key={r} className="flex gap-2 font-body text-xs leading-snug text-muted">
                  <ThumbsDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          )}
          {data.fuente === 'ia' && (
            <p className="font-body text-[10px] text-muted">
              Evaluado por IA ({data.modelo}){data.desde_cache ? ' · resultado guardado' : ''}. Es una orientación, no una decisión.
            </p>
          )}
        </>
      )}
    </div>
  )
}

// Cuánto tarda el estudiante en llegar a la zona de la vacante (A* sobre el mapa de zonas).
function TrasladoCard({ studentId, vacancyId }) {
  const [estado, setEstado] = useState({ key: '', data: null })
  const key = `${studentId}:${vacancyId}`

  useEffect(() => {
    let cancelled = false
    getTrasladoPar(studentId, vacancyId)
      .then((data) => !cancelled && setEstado({ key, data }))
      .catch(() => !cancelled && setEstado({ key, data: null }))
    return () => {
      cancelled = true
    }
  }, [studentId, vacancyId, key])

  const t = estado.key === key ? estado.data : null
  if (!t) return null

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
      <p className="flex items-center gap-2 font-body text-xs font-semibold text-ink">
        <MapPin className="h-4 w-4 text-cocoa" />
        Traslado estimado
      </p>
      {!t.conocido ? (
        <p className="font-body text-xs text-muted">No tenemos tu zona o la de la vacante en el mapa de traslados.</p>
      ) : (
        <>
          <p className="font-body text-sm text-ink">
            <b>{t.minutos_reales === 0 ? 'Misma zona' : `${t.minutos_reales} min`}</b>
            <span className={t.compatible ? 'text-teal' : 'text-brand'}>
              {' '}· {t.compatible ? 'dentro' : 'fuera'} del límite de {t.limite_minutos} min
            </span>
          </p>
          <p className="flex flex-wrap items-center gap-1 font-body text-xs text-muted">
            {t.ruta.map((z, i) => (
              <span key={`${z}-${i}`} className="flex items-center gap-1">
                {z}
                {i < t.ruta.length - 1 && <ArrowRight className="h-3 w-3" />}
              </span>
            ))}
          </p>
          <p className="font-body text-[11px] text-muted">
            Calculado con A*: estimó {t.minutos_estimados} min al inicio, revisó {t.nodos_explorados} zonas y el tiempo real del
            mapa es {t.minutos_reales} min.{' '}
            <Link to={`/traslado?desde=${encodeURIComponent(t.origen)}&hasta=${encodeURIComponent(t.destino)}`} className="font-semibold text-brand hover:underline">
              Ver cómo se calcula
            </Link>
          </p>
        </>
      )}
    </div>
  )
}

export default function EligibilityPanel({ vacancyId }) {
  const [students, setStudents] = useState([])
  const [studentsError, setStudentsError] = useState(null)
  const { usuario } = useAuth()
  const esEstudiante = usuario?.rol === 'estudiante'
  const [miPerfil] = useActiveStudent()
  // El estudiante se evalúa a sí mismo; empresa y personal eligen a quién evaluar.
  const [elegido, setElegido] = useState('')
  const studentId = esEstudiante ? miPerfil : elegido
  // Resultado de la última consulta; `key` indica a qué par (estudiante, vacante) pertenece.
  const [outcome, setOutcome] = useState(null)

  useEffect(() => {
    if (esEstudiante) return
    getStudents()
      .then(setStudents)
      .catch((err) => setStudentsError(err.message))
  }, [esEstudiante])

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
    setElegido(event.target.value)
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

      {esEstudiante ? (
        !studentId && (
          <p className="font-body text-xs text-muted">
            <Link to="/perfil/crear" className="font-semibold text-brand hover:underline">
              Crea tu perfil
            </Link>{' '}
            para ver tu compatibilidad con esta vacante.
          </p>
        )
      ) : (
        <div>
          <label htmlFor="student" className="mb-1.5 block font-body text-xs font-medium text-ink">
            Evaluar a
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
            <p className="mt-2 font-body text-xs text-muted">Aún no hay estudiantes registrados.</p>
          )}
        </div>
      )}

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
              Calculada por reglas: carrera, skills, horas y zona. El análisis con IA va en el filtro 2.
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

      {shown && !loading && <TrasladoCard studentId={studentId} vacancyId={vacancyId} />}
      {shown && !loading && <FiltroIA studentId={studentId} vacancyId={vacancyId} elegible={shown.elegible} />}
    </aside>
  )
}
