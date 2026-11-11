import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDownToLine, Briefcase, Check, GitBranch, Scale, SlidersHorizontal, UserRound, X } from 'lucide-react'
import { useAuth } from '../../context/auth'
import useActiveStudent from '../../hooks/useActiveStudent'
import { getPrediccionML, getStudents, getVacancies, simularML } from '../../services/api'

const selectCls =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 font-body text-sm text-ink focus:border-cocoa focus:outline-none'

const VARIABLES_POR_DEFECTO = [
  { clave: 'horas_dedicacion', nombre: 'Horas de dedicación', min: 0, max: 15, unidad: 'pts/sem', rango: '0 a 15' },
  { clave: 'compatibilidad_horaria', nombre: 'Compatibilidad horaria y traslado', min: 30, max: 100, unidad: '%', rango: '30 a 100' },
  { clave: 'cobertura_skills', nombre: 'Cobertura de skills y carrera', min: 10, max: 100, unidad: '%', rango: '10 a 100' },
  { clave: 'participacion_perfil', nombre: 'Participación y preparación', min: 0, max: 10, unidad: '/ 10', rango: '0 a 10' },
]

const EJEMPLOS_RAPIDOS = [
  {
    etiqueta: 'Caso frontera (ML acepta, reglas rechazan)',
    valores: { horas_dedicacion: 11, compatibilidad_horaria: 90, cobertura_skills: 88, participacion_perfil: 4 },
  },
  {
    etiqueta: 'Perfil sobresaliente',
    valores: { horas_dedicacion: 12, compatibilidad_horaria: 94, cobertura_skills: 92, participacion_perfil: 8 },
  },
  {
    etiqueta: 'Perfil en etapa inicial',
    valores: { horas_dedicacion: 3, compatibilidad_horaria: 55, cobertura_skills: 35, participacion_perfil: 3 },
  },
]

function ComparadorResultado({ resultado }) {
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
              <li key={f} className="flex items-center gap-2 text-brand font-medium">
                <X className="h-3.5 w-3.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Tarjeta Machine Learning */}
        <div className={`stat flex flex-col gap-3 p-5 ${ml.prediccion === 1 ? 'ring-2 ring-teal/50' : 'ring-2 ring-brand/30'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-wider text-muted">
              <GitBranch className="h-4 w-4 text-brand" />
              Machine Learning · Árbol (depth={ml.max_depth})
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
            <span>Calificación final estimada: <b className="text-ink">{cal} / 100</b></span>
            <span>Exactitud en prueba: <b className="text-ink">{ml.exactitud_prueba}%</b></span>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 font-body text-sm leading-relaxed text-ink ${coinciden ? 'border-line bg-surface' : 'border-brand/40 bg-brand-soft'}`}>
        <b className="font-semibold">{coinciden ? 'Coincidencia entre sistemas: ' : 'Diferencia clave entre Reglas y ML: '}</b>
        {resumen}
      </div>
    </div>
  )
}

export default function VistaSimulador({ variables }) {
  const metaVars = variables ?? VARIABLES_POR_DEFECTO
  const [params, setParams] = useSearchParams()
  const { usuario } = useAuth()
  const esEstudiante = usuario?.rol === 'estudiante'
  const [miPerfil] = useActiveStudent()

  const [students, setStudents] = useState([])
  const [vacancies, setVacancies] = useState([])
  const [elegidoEst, setElegidoEst] = useState(params.get('estudiante') || '')
  const [vacancyId, setVacancyId] = useState(params.get('vacante') || '')

  const studentId = esEstudiante ? miPerfil : elegidoEst

  const [parReal, setParReal] = useState({ key: '', data: null, error: null })
  const [valoresSim, setValoresSim] = useState(EJEMPLOS_RAPIDOS[0].valores)
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
      {/* BLOQUE 1: EVALUAR PAR REAL DE LINKEA */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-2xl font-medium text-ink">1. Evaluar una postulación real de Linkea</h2>
          <p className="mt-1 font-body text-sm text-muted">
            Extrae automáticamente las 4 variables desde el perfil del estudiante y los requisitos de la vacante (incluyendo el traslado con A*).
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
                {metaVars.map((v) => (
                  <div key={v.clave} className="stat px-4 py-3">
                    <p className="font-body text-xs text-muted">{v.nombre}</p>
                    <p className="mt-1 font-heading text-2xl font-medium text-ink">
                      {datosPar.caracteristicas[v.clave]}
                      <span className="ml-1 font-body text-xs font-normal text-muted">{v.unidad}</span>
                    </p>
                    <p className="mt-0.5 font-body text-[11px] text-muted">Rango: {v.rango}</p>
                  </div>
                ))}
              </div>

              <ComparadorResultado resultado={datosPar} />

              <div>
                <button
                  type="button"
                  onClick={() => setValoresSim(datosPar.caracteristicas)}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 py-2 font-body text-xs font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Copiar estos valores al simulador de abajo para experimentar
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* BLOQUE 2: SIMULADOR INTERACTIVO ("PROBAR UN ESTUDIANTE NUEVO") */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-2xl font-medium text-ink">
              <SlidersHorizontal className="h-6 w-6 text-brand" />
              2. Simulador de candidato nuevo
            </h2>
            <p className="mt-1 font-body text-sm text-muted">
              Mueve las 4 variables en sus rangos válidos para observar cómo decide el árbol frente a las reglas manuales.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {EJEMPLOS_RAPIDOS.map((ej) => (
              <button
                key={ej.etiqueta}
                type="button"
                onClick={() => setValoresSim(ej.valores)}
                className="rounded-full border border-line bg-surface px-3.5 py-1.5 font-body text-xs font-medium text-ink transition-colors hover:border-brand hover:bg-brand-soft"
              >
                {ej.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div className="card flex flex-col gap-6 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {metaVars.map((v) => {
              const valor = valoresSim[v.clave]
              return (
                <label key={v.clave} className="stat flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between font-body text-sm">
                    <span className="font-semibold text-ink">{v.nombre}</span>
                    <span className="font-heading text-xl font-semibold text-brand">
                      {valor} <span className="font-body text-xs font-normal text-muted">{v.unidad}</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={v.min}
                    max={v.max}
                    value={valor}
                    onChange={(e) => setValoresSim((prev) => ({ ...prev, [v.clave]: Number(e.target.value) }))}
                    className="accent-[var(--brand)]"
                  />
                  <div className="flex justify-between font-body text-[11px] text-muted">
                    <span>Mín: {v.min}</span>
                    <span>Rango permitido ({v.rango})</span>
                    <span>Máx: {v.max}</span>
                  </div>
                </label>
              )
            })}
          </div>

          <ComparadorResultado resultado={resSim} />
        </div>
      </section>
    </div>
  )
}
