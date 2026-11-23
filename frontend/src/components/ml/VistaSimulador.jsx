import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDownToLine,
  Briefcase,
  Check,
  CircleAlert,
  GitBranch,
  Scale,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/auth'
import useActiveStudent from '../../hooks/useActiveStudent'
import { getPrediccionML, getStudents, getVacancies, simularML } from '../../services/api'

const selectCls =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 font-body text-sm text-ink focus:border-cocoa focus:outline-none'

const FACTORES_HUMANOS = [
  {
    clave: 'horas_dedicacion',
    nombre: 'Holgura de tiempo semanal',
    ayuda: 'Qué tan cómodas te quedan las horas que pide la vacante frente a tu horario disponible.',
    min: 0,
    max: 15,
    unidad: 'pts',
    etiquetaMin: 'Tiempo muy justo',
    etiquetaMax: 'Tiempo de sobra',
  },
  {
    clave: 'compatibilidad_horaria',
    nombre: 'Horario y facilidad de traslado',
    ayuda: 'Combina las horas que cubres con qué tan rápido llegas desde tu zona (o si es remoto).',
    min: 30,
    max: 100,
    unidad: '%',
    etiquetaMin: 'Lejos o horario difícil',
    etiquetaMax: 'Cerca o remoto',
  },
  {
    clave: 'cobertura_skills',
    nombre: 'Habilidades y carrera afín',
    ayuda: 'Cuántas de las herramientas que pide la vacante ya dominas y si tu carrera coincide.',
    min: 10,
    max: 100,
    unidad: '%',
    etiquetaMin: 'Pocas en común',
    etiquetaMax: 'Domina casi todas',
  },
  {
    clave: 'participacion_perfil',
    nombre: 'Preparación de tu perfil',
    ayuda: 'Proyectos en portafolio, semestre cursado, idiomas registrados y CV subido en Linkea.',
    min: 0,
    max: 10,
    unidad: '/ 10',
    etiquetaMin: 'Perfil básico',
    etiquetaMax: 'Perfil muy completo',
  },
]

const ESCENARIOS_RAPIDOS = [
  {
    etiqueta: 'Buenas habilidades pero poco portafolio',
    valores: { horas_dedicacion: 11, compatibilidad_horaria: 90, cobertura_skills: 88, participacion_perfil: 4 },
  },
  {
    etiqueta: 'Perfil listo para postularse',
    valores: { horas_dedicacion: 12, compatibilidad_horaria: 94, cobertura_skills: 92, participacion_perfil: 8 },
  },
  {
    etiqueta: 'Perfil que recién empieza',
    valores: { horas_dedicacion: 3, compatibilidad_horaria: 55, cobertura_skills: 35, participacion_perfil: 3 },
  },
]

function obtenerProbabilidadPrincipal(resultado) {
  if (!resultado) return 0
  return resultado.algoritmos_p05?.ganador?.probabilidad_aceptacion ?? resultado.ml?.probabilidad_aceptacion ?? 0
}

// Vista técnica: solo para coordinación. Muestra el árbol, la exactitud y la comparación con reglas fijas.
function ComparadorTecnico({ resultado }) {
  if (!resultado) return null
  const { reglas, ml, coinciden, resumen, calificacion_estimada: cal } = resultado

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Tarjeta Reglas Fijas */}
        <div className="stat flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-wider text-muted">
              <Scale className="h-4 w-4 text-cocoa" />
              Sistema de reglas fijas
            </span>
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-body text-xs font-semibold ${
                reglas.prediccion === 1 ? 'bg-teal text-white' : 'bg-brand text-on-brand'
              }`}
            >
              {reglas.prediccion === 1 ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {reglas.etiqueta}
            </span>
          </div>
          <p className="font-body text-xs text-muted">
            Exige cumplir simultáneamente los 4 cortes manuales definidos por una persona.
          </p>
          <ul className="flex flex-col gap-1.5 font-body text-xs">
            {reglas.cumplidas.map((c) => (
              <li key={c} className="flex items-center gap-2 text-ink">
                <Check className="h-3.5 w-3.5 shrink-0 text-teal" />
                {c}
              </li>
            ))}
            {reglas.faltantes.map((f) => (
              <li key={f} className="flex items-center gap-2 font-medium text-brand">
                <X className="h-3.5 w-3.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Tarjeta Machine Learning */}
        <div
          className={`stat flex flex-col gap-3 p-5 ${
            ml.prediccion === 1 ? 'ring-2 ring-teal/50' : 'ring-2 ring-brand/30'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-wider text-muted">
              <GitBranch className="h-4 w-4 text-brand" />
              Modelo de Linkea · Árbol de decisión (profundidad {ml.max_depth})
            </span>
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-body text-xs font-semibold ${
                ml.prediccion === 1 ? 'bg-teal text-white' : 'bg-brand text-on-brand'
              }`}
            >
              {ml.prediccion === 1 ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {ml.etiqueta}
            </span>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between font-body text-xs">
              <span className="text-muted">Probabilidad aprendida de aceptación</span>
              <span className="font-heading text-lg font-semibold text-ink">{ml.probabilidad_aceptacion}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full transition-all ${ml.prediccion === 1 ? 'bg-teal' : 'bg-brand'}`}
                style={{ width: `${ml.probabilidad_aceptacion}%` }}
              />
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 font-body text-xs text-muted">
            <span>
              Calificación final estimada: <b className="text-ink">{cal} / 100</b>
            </span>
            <span>
              Aciertos en las pruebas: <b className="text-ink">{ml.exactitud_prueba}%</b>
            </span>
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl border p-4 font-body text-sm leading-relaxed text-ink ${
          coinciden ? 'border-line bg-surface' : 'border-brand/40 bg-brand-soft'
        }`}
      >
        <b className="font-semibold">
          {coinciden ? 'Coincidencia entre sistemas: ' : 'Diferencia clave entre Reglas y ML: '}
        </b>
        {resumen}
      </div>
    </div>
  )
}

// Vista sencilla: para estudiantes y para cualquier rol que no sea coordinación.
function ResumenHumano({ resultado, probBase }) {
  if (!resultado) return null
  const prob = obtenerProbabilidadPrincipal(resultado)
  const favorable = prob >= 50
  const nivel =
    prob >= 75
      ? 'Alta posibilidad de ser aceptado'
      : prob >= 50
        ? 'Posibilidad moderada de aceptación'
        : 'Conviene fortalecer algunos puntos antes'

  const cumplidas = resultado.reglas?.cumplidas ?? []
  const faltantes = resultado.reglas?.faltantes ?? []
  const cambio = typeof probBase === 'number' ? Number((prob - probBase).toFixed(1)) : null

  let consejo = ''
  if (prob >= 75 && faltantes.length === 0) {
    consejo =
      'Tu perfil encaja muy bien con lo que históricamente aceptan las empresas en Linkea. Es un excelente momento para postularte.'
  } else if (favorable && faltantes.length > 0) {
    consejo =
      'Aunque hay puntos por reforzar, en postulaciones anteriores de Linkea perfiles con tus fortalezas sí han sido aceptados.'
  } else {
    consejo =
      'En postulaciones pasadas parecidas, subir un proyecto al portafolio, ajustar horas disponibles o aprender una habilidad clave marcó la diferencia.'
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`stat flex flex-col gap-4 p-5 ${favorable ? 'ring-2 ring-teal/50' : 'ring-1 ring-brand/30'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                favorable ? 'bg-teal text-white' : 'bg-brand-soft text-brand'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted">
                Pronóstico basado en postulaciones anteriores
              </p>
              <p className="font-heading text-xl font-medium text-ink">{nivel}</p>
            </div>
          </div>

          <div className="flex items-baseline gap-2.5">
            {cambio !== null && Math.abs(cambio) >= 0.5 && (
              <span
                className={`rounded-full px-2.5 py-0.5 font-body text-xs font-semibold ${
                  cambio > 0 ? 'bg-teal text-white' : 'bg-brand-soft text-brand'
                }`}
              >
                {cambio > 0 ? `+${cambio}%` : `${cambio}%`} frente a tu perfil actual
              </span>
            )}
            <span className="font-heading text-3xl font-semibold text-ink">{prob}%</span>
          </div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-line">
          <div
            className={`h-full rounded-full transition-all ${favorable ? 'bg-teal' : 'bg-brand'}`}
            style={{ width: `${prob}%` }}
          />
        </div>

        <p className="font-body text-sm leading-relaxed text-ink">{consejo}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="stat flex flex-col gap-2.5 p-4">
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-teal">Lo que juega a tu favor</p>
          {cumplidas.length === 0 ? (
            <p className="font-body text-xs text-muted">Aún no alcanzas los niveles recomendados en estos cuatro puntos.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 font-body text-xs text-ink">
              {cumplidas.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-teal" />
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="stat flex flex-col gap-2.5 p-4">
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-brand">Qué te ayudaría mejorar</p>
          {faltantes.length === 0 ? (
            <p className="font-body text-xs text-muted">Cumples holgadamente todos los puntos recomendados.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 font-body text-xs text-ink">
              {faltantes.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CircleAlert className="h-3.5 w-3.5 shrink-0 text-brand" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VistaSimulador() {
  const [params, setParams] = useSearchParams()
  const { usuario } = useAuth()
  const esEstudiante = usuario?.rol === 'estudiante'
  // La vista técnica (árbol, exactitud, reglas fijas) es solo para coordinación.
  const esCoordinador = usuario?.rol === 'coordinador'
  const [miPerfil] = useActiveStudent()

  const [students, setStudents] = useState([])
  const [vacancies, setVacancies] = useState([])
  const [elegidoEst, setElegidoEst] = useState(params.get('estudiante') || '')
  const [vacancyId, setVacancyId] = useState(params.get('vacante') || '')

  const studentId = esEstudiante ? miPerfil : elegidoEst

  const [parReal, setParReal] = useState({ key: '', data: null, error: null })
  const [valoresSim, setValoresSim] = useState(ESCENARIOS_RAPIDOS[0].valores)
  const [probReferencia, setProbReferencia] = useState(null)
  const [resSim, setResSim] = useState(null)

  useEffect(() => {
    getVacancies()
      .then((lista) => {
        setVacancies(lista)
        if (!vacancyId && lista[0]) setVacancyId(lista[0].id)
      })
      .catch(() => {})
    if (!esEstudiante) {
      getStudents()
        .then((lista) => {
          setStudents(lista)
          if (!elegidoEst && lista[0]) setElegidoEst(lista[0].id)
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esEstudiante])

  const parKey = `${studentId}:${vacancyId}`

  useEffect(() => {
    if (!studentId || !vacancyId) return undefined
    let cancelled = false
    getPrediccionML(studentId, vacancyId)
      .then((data) => !cancelled && setParReal({ key: parKey, data, error: null }))
      .catch((err) => !cancelled && setParReal({ key: parKey, data: null, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [studentId, vacancyId, parKey])

  useEffect(() => {
    let cancelled = false
    simularML(valoresSim)
      .then((data) => !cancelled && setResSim(data))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [valoresSim])

  const datosPar = parReal.key === parKey ? parReal.data : null

  function actualizarUrl(nuevoEst, nuevaVac) {
    const siguientes = new URLSearchParams(params)
    if (nuevoEst) siguientes.set('estudiante', nuevoEst)
    if (nuevaVac) siguientes.set('vacante', nuevaVac)
    setParams(siguientes, { replace: true })
  }

  return (
    <div className="flex flex-col gap-10">
      {/* BLOQUE 1: CONSULTAR POSIBILIDADES EN UNA VACANTE REAL */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-2xl font-medium text-ink">
            {esEstudiante ? '1. Revisa tus posibilidades en una vacante' : '1. Pronóstico de encaje entre estudiante y vacante'}
          </h2>
          <p className="mt-1 font-body text-sm text-muted">
            Compara automáticamente el perfil, habilidades, horario y traslado con lo ocurrido en postulaciones anteriores de Linkea.
          </p>
        </div>

        <div className="card flex flex-col gap-6 p-6">
          <div className={`grid gap-4 ${esEstudiante ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}>
            {!esEstudiante && (
              <label className="flex flex-col gap-2 font-body text-sm font-semibold text-ink">
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-brand" /> Estudiante
                </span>
                <select
                  className={selectCls}
                  value={studentId || ''}
                  onChange={(e) => {
                    setElegidoEst(e.target.value)
                    actualizarUrl(e.target.value, vacancyId)
                  }}
                >
                  <option value="">Selecciona un estudiante...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} · {s.carrera}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex flex-col gap-2 font-body text-sm font-semibold text-ink">
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-brand" /> Vacante
              </span>
              <select
                className={selectCls}
                value={vacancyId}
                onChange={(e) => {
                  setVacancyId(e.target.value)
                  actualizarUrl(studentId, e.target.value)
                }}
              >
                <option value="">Selecciona una vacante...</option>
                {vacancies.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.titulo} · {v.nombre_empresa} ({v.ubicacion.zona})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {parReal.error && <p className="font-body text-sm text-brand">{parReal.error}</p>}

          {datosPar && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {FACTORES_HUMANOS.map((v) => (
                  <div key={v.clave} className="stat px-4 py-3">
                    <p className="font-body text-xs font-semibold text-ink">{v.nombre}</p>
                    <p className="mt-1 font-heading text-2xl font-medium text-ink">
                      {datosPar.caracteristicas[v.clave]}
                      <span className="ml-1 font-body text-xs font-normal text-muted">{v.unidad}</span>
                    </p>
                    <p className="mt-1 font-body text-[11px] leading-snug text-muted">{v.ayuda}</p>
                  </div>
                ))}
              </div>

              {esCoordinador ? <ComparadorTecnico resultado={datosPar} /> : <ResumenHumano resultado={datosPar} />}

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setValoresSim(datosPar.caracteristicas)
                    setProbReferencia(obtenerProbabilidadPrincipal(datosPar))
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 py-2.5 font-body text-xs font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Llevar estos datos al simulador de abajo para probar mejoras
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* BLOQUE 2: SIMULADOR INTERACTIVO EN LENGUAJE CLARO */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-2xl font-medium text-ink">
              <SlidersHorizontal className="h-6 w-6 text-brand" />
              2. ¿Cómo puedo subir mis posibilidades?
            </h2>
            <p className="mt-1 font-body text-sm text-muted">
              Mueve cada barra para simular qué pasaría si liberas más horas, sumas habilidades o completas tu portafolio y CV.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {ESCENARIOS_RAPIDOS.map((ej) => (
              <button
                key={ej.etiqueta}
                type="button"
                onClick={() => {
                  setValoresSim(ej.valores)
                  setProbReferencia(null)
                }}
                className="rounded-full border border-line bg-surface px-3.5 py-1.5 font-body text-xs font-medium text-ink transition-colors hover:border-brand hover:bg-brand-soft"
              >
                {ej.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div className="card flex flex-col gap-6 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {FACTORES_HUMANOS.map((v) => {
              const valor = valoresSim[v.clave]
              return (
                <label key={v.clave} className="stat flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between font-body text-sm">
                    <span className="font-semibold text-ink">{v.nombre}</span>
                    <span className="font-heading text-xl font-semibold text-brand">
                      {valor} <span className="font-body text-xs font-normal text-muted">{v.unidad}</span>
                    </span>
                  </div>
                  <p className="font-body text-xs text-muted">{v.ayuda}</p>
                  <input
                    type="range"
                    min={v.min}
                    max={v.max}
                    value={valor}
                    onChange={(e) => setValoresSim((prev) => ({ ...prev, [v.clave]: Number(e.target.value) }))}
                    className="mt-1 accent-[var(--brand)]"
                  />
                  <div className="flex justify-between font-body text-[11px] text-muted">
                    <span>{v.etiquetaMin}</span>
                    <span>{v.etiquetaMax}</span>
                  </div>
                </label>
              )
            })}
          </div>

          {esCoordinador ? (
            <ComparadorTecnico resultado={resSim} />
          ) : (
            <ResumenHumano resultado={resSim} probBase={probReferencia} />
          )}
        </div>
      </section>
    </div>
  )
}
