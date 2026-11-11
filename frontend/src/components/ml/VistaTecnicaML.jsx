import { useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { BarrasH, Dona } from '../coordinacion/Graficas'
import { descargarGraficaML, entrenarML, obtenerGraficaBlobML } from '../../services/api'

function Seccion({ n, titulo, subtitulo, children }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-3 font-heading text-2xl font-medium text-ink">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-body text-sm font-bold text-on-brand">
            {n}
          </span>
          {titulo}
        </h2>
        {subtitulo && <p className="mt-1 pl-11 font-body text-sm text-muted">{subtitulo}</p>}
      </div>
      {children}
    </section>
  )
}

function Dato({ etiqueta, valor, detalle, destacado }) {
  return (
    <div className={`stat px-4 py-3 ${destacado ? 'ring-2 ring-brand/40' : ''}`}>
      <dt className="font-body text-xs uppercase tracking-wider text-muted">{etiqueta}</dt>
      <dd className="mt-1 font-heading text-2xl font-medium text-ink">{valor}</dd>
      {detalle && <p className="mt-0.5 font-body text-xs text-muted">{detalle}</p>}
    </div>
  )
}

// Gráfica vectorial interactiva de max_depth vs exactitud (se adapta sola a modo claro/oscuro).
function GraficaProfundidadSVG({ historial, mejor }) {
  const W = 620
  const H = 240
  const padL = 52
  const padR = 24
  const padT = 20
  const padB = 38

  const valores = historial.flatMap((h) => [h.exactitud_validacion, h.exactitud_cruzada])
  const minY = Math.max(0, Math.floor(Math.min(...valores) * 20 - 1) / 20)
  const maxY = Math.min(1, Math.ceil(Math.max(...valores) * 20 + 1) / 20)
  const spanY = Math.max(0.05, maxY - minY)

  const xDe = (i) => padL + (i / Math.max(1, historial.length - 1)) * (W - padL - padR)
  const yDe = (v) => padT + (1 - (v - minY) / spanY) * (H - padT - padB)

  const lineaVal = historial.map((h, i) => `${xDe(i)},${yDe(h.exactitud_validacion)}`).join(' ')
  const lineaCV = historial.map((h, i) => `${xDe(i)},${yDe(h.exactitud_cruzada)}`).join(' ')
  const idxMejor = historial.findIndex((h) => h.max_depth === mejor)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Exactitud según profundidad máxima del árbol">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const val = minY + t * spanY
        const y = yDe(val)
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--line)" strokeDasharray="4 4" />
            <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-muted font-body text-[11px]">
              {Math.round(val * 100)}%
            </text>
          </g>
        )
      })}

      {idxMejor >= 0 && (
        <line
          x1={xDe(idxMejor)}
          y1={padT}
          x2={xDe(idxMejor)}
          y2={H - padB}
          stroke="var(--teal)"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      )}

      <polyline fill="none" stroke="var(--caramel)" strokeWidth="2.5" points={lineaCV} />
      <polyline fill="none" stroke="var(--brand)" strokeWidth="2.8" points={lineaVal} />

      {historial.map((h, i) => (
        <g key={h.max_depth}>
          <rect
            x={xDe(i) - 4}
            y={yDe(h.exactitud_cruzada) - 4}
            width="8"
            height="8"
            rx="1.5"
            fill="var(--caramel)"
          />
          <circle cx={xDe(i)} cy={yDe(h.exactitud_validacion)} r={h.max_depth === mejor ? 6 : 4.5} fill="var(--brand)" />
          <text x={xDe(i)} y={H - 12} textAnchor="middle" className="fill-ink font-body text-[11px] font-semibold">
            {h.max_depth}
          </text>
        </g>
      ))}
    </svg>
  )
}

function GraficaMatplotlib({ nombre, titulo, sello }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let revocar = ''
    let cancelado = false
    obtenerGraficaBlobML(nombre)
      .then((blob) => {
        if (cancelado) return
        revocar = URL.createObjectURL(blob)
        setUrl(revocar)
      })
      .catch(() => {})
    return () => {
      cancelado = true
      if (revocar) URL.revokeObjectURL(revocar)
    }
  }, [nombre, sello])

  return (
    <div className="stat flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-xs font-semibold text-ink">{titulo}</p>
        <button
          type="button"
          onClick={() => descargarGraficaML(nombre, `linkea_${nombre}.png`)}
          className="inline-flex items-center gap-1 font-body text-xs font-semibold text-brand hover:underline"
        >
          <Download className="h-3.5 w-3.5" /> PNG
        </button>
      </div>
      {url ? (
        <img src={url} alt={titulo} className="w-full rounded-lg border border-line bg-white" />
      ) : (
        <div className="h-44 animate-pulse rounded-lg bg-canvas" />
      )}
    </div>
  )
}

export default function VistaTecnicaML({ estado: inicial, loading, onReload }) {
  const [recienEntrenado, setRecienEntrenado] = useState(null)
  const [cantidad, setCantidad] = useState(500)
  const [semilla, setSemilla] = useState(42)
  const [entrenando, setEntrenando] = useState(false)
  const [errorEntrenar, setErrorEntrenar] = useState(null)

  const metricas = recienEntrenado ?? inicial

  async function manejarReentrenar(e) {
    e.preventDefault()
    setEntrenando(true)
    setErrorEntrenar(null)
    try {
      const nuevo = await entrenarML({ cantidad: Number(cantidad), semilla: Number(semilla) })
      setRecienEntrenado(nuevo)
      if (onReload) onReload()
    } catch (err) {
      setErrorEntrenar(err.message)
    } finally {
      setEntrenando(false)
    }
  }

  if (loading && !metricas) {
    return <div className="card h-64 animate-pulse" aria-busy="true" />
  }
  if (!metricas) return null

  const { datos, division, validacion, prueba, arbol } = metricas
  const [[vn, fp], [fn, vp]] = prueba.matriz_confusion_ml
  const repNo = prueba.reporte_clasificacion.no_aceptado
  const repSi = prueba.reporte_clasificacion.aceptado

  return (
    <div className="flex flex-col gap-10">
      {/* 1. DATOS Y DIVISIÓN 60 / 20 / 20 */}
      <Seccion
        n="1"
        titulo="Datos históricos y división 60% / 20% / 20%"
        subtitulo="El entrenamiento aprende los patrones, la validación ajusta hiperparámetros y la prueba evalúa el desempeño final con casos nunca vistos."
      >
        <div className="card flex flex-col gap-6 p-6">
          <form onSubmit={manejarReentrenar} className="flex flex-wrap items-end gap-4 border-b border-line pb-5">
            <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-ink">
              Total de estudiantes / postulaciones
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-48 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-sm text-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-ink">
              Semilla aleatoria (seed)
              <input
                type="number"
                min={0}
                max={99999}
                value={semilla}
                onChange={(e) => setSemilla(e.target.value)}
                className="w-36 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-sm text-ink"
              />
            </label>
            <button
              type="submit"
              disabled={entrenando}
              className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-body text-sm font-semibold text-on-brand disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${entrenando ? 'animate-spin' : ''}`} />
              {entrenando ? 'Entrenando modelo...' : 'Reentrenar modelo'}
            </button>
            <p className="ml-auto font-body text-xs text-muted">
              Registros reales en BD: <b className="text-ink">{datos.registros_reales}</b> · Sintéticos:{' '}
              <b className="text-ink">{datos.registros_sinteticos}</b>
            </p>
          </form>

          {errorEntrenar && <p className="font-body text-sm text-brand">{errorEntrenar}</p>}

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Dato etiqueta="Total del dataset" valor={`${datos.filas} filas`} detalle={`${datos.columnas} columnas · 0 faltantes`} />
            <Dato etiqueta="Entrenamiento (60%)" valor={division.entrenamiento} detalle="Aprende los patrones del árbol" destacado />
            <Dato etiqueta="Validación (20%)" valor={division.validacion} detalle="Ajusta max_depth y elige modelo" />
            <Dato etiqueta="Prueba (20%)" valor={division.prueba} detalle="Evalúa con datos no usados antes" />
          </dl>

          {/* Barra proporcional 60/20/20 */}
          <div>
            <div className="flex h-3.5 w-full overflow-hidden rounded-full">
              <div className="bg-brand" style={{ width: '60%' }} title="60% Entrenamiento" />
              <div className="bg-caramel" style={{ width: '20%' }} title="20% Validación" />
              <div className="bg-teal" style={{ width: '20%' }} title="20% Prueba" />
            </div>
            <div className="mt-2 flex flex-wrap gap-5 font-body text-xs text-muted">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-brand" /> 60% Entrenamiento ({division.entrenamiento})</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-caramel" /> 20% Validación ({division.validacion})</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-teal" /> 20% Prueba ({division.prueba})</span>
            </div>
          </div>

          <div className="grid gap-6 pt-2 lg:grid-cols-[1fr_1.4fr]">
            <div className="stat p-4">
              <p className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-muted">
                Distribución de la variable objetivo
              </p>
              <Dona
                centro="Total"
                items={[
                  ['Aceptado (1)', datos.distribucion_clases.aceptado],
                  ['No aceptado (0)', datos.distribucion_clases.no_aceptado],
                ]}
              />
            </div>

            <div className="overflow-x-auto">
              <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wider text-muted">
                Muestra de registros (primeros 6 de {datos.filas})
              </p>
              <table className="w-full border-collapse font-body text-xs text-ink">
                <thead>
                  <tr className="border-b border-line text-left text-muted">
                    <th className="py-2 pr-2">Horas (0-15)</th>
                    <th className="px-2">Horario (30-100)</th>
                    <th className="px-2">Skills (10-100)</th>
                    <th className="px-2">Partic. (0-10)</th>
                    <th className="px-2">Calif. final</th>
                    <th className="pl-2">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.muestra.slice(0, 6).map((fila, idx) => (
                    <tr key={idx} className="border-b border-line/60">
                      <td className="py-2 pr-2 font-medium">{fila.horas_dedicacion}</td>
                      <td className="px-2">{fila.compatibilidad_horaria}%</td>
                      <td className="px-2">{fila.cobertura_skills}%</td>
                      <td className="px-2">{fila.participacion_perfil}</td>
                      <td className="px-2 font-semibold">{fila.calificacion_final}</td>
                      <td className="pl-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${fila.aceptado === 1 ? 'bg-teal/25 text-ink' : 'bg-brand-soft text-ink'}`}>
                          {fila.aceptado === 1 ? 'Aceptado' : 'No aceptado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Seccion>

      {/* 2. VALIDACIÓN Y VALIDACIÓN CRUZADA */}
      <Seccion
        n="2"
        titulo="Selección del modelo con Validación y Validación Cruzada (cv=5)"
        subtitulo="Se prueban profundidades max_depth de 1 a 8 entrenando solo con el 60% y evaluando en el 20% de validación + cross_val_score."
      >
        <div className="card grid gap-6 p-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 font-body text-xs">
              <span className="font-semibold text-ink">Exactitud por profundidad del árbol</span>
              <div className="flex flex-wrap gap-4 text-muted">
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-brand" /> Validación (20%)</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-caramel" /> Cruzada (cv=5)</span>
                <span className="flex items-center gap-1.5 text-ink font-semibold">Óptimo: max_depth={validacion.mejor_max_depth}</span>
              </div>
            </div>
            <GraficaProfundidadSVG historial={validacion.historial} mejor={validacion.mejor_max_depth} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-body text-xs text-ink">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-2">max_depth</th>
                  <th className="px-2">Entren.</th>
                  <th className="px-2">Validación</th>
                  <th className="pl-2">Cruzada (cv=5)</th>
                </tr>
              </thead>
              <tbody>
                {validacion.historial.map((h) => {
                  const esMejor = h.max_depth === validacion.mejor_max_depth
                  return (
                    <tr key={h.max_depth} className={`border-b border-line/60 ${esMejor ? 'bg-brand-soft font-semibold' : ''}`}>
                      <td className="py-2 pr-2">
                        {h.max_depth} {esMejor && <span className="ml-1 rounded-full bg-teal px-2 py-0.5 text-[10px] text-white">elegido</span>}
                      </td>
                      <td className="px-2">{(h.exactitud_entrenamiento * 100).toFixed(1)}%</td>
                      <td className="px-2">{(h.exactitud_validacion * 100).toFixed(1)}%</td>
                      <td className="pl-2">
                        {(h.exactitud_cruzada * 100).toFixed(1)}% <span className="text-muted">±{(h.desviacion_cruzada * 100).toFixed(1)}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Seccion>

      {/* 3. EVALUACIÓN EN PRUEBA: REGLAS VS ML + MATRIZ DE CONFUSIÓN */}
      <Seccion
        n="3"
        titulo="Evaluación final en el conjunto de prueba (Reglas Fijas vs ML)"
        subtitulo="Se mide sobre el 20% reservado para prueba que no intervino ni en el entrenamiento ni en la elección de max_depth."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Exactitud + Reporte */}
          <div className="card flex flex-col gap-5 p-6">
            <div className="grid grid-cols-2 gap-3">
              <Dato
                etiqueta="Reglas fijas"
                valor={`${(prueba.exactitud_reglas * 100).toFixed(2)}%`}
                detalle="Condiciones manuales rígidas"
              />
              <Dato
                etiqueta="Árbol de decisión (ML)"
                valor={`${(prueba.exactitud_ml * 100).toFixed(2)}%`}
                detalle={`${prueba.diferencia_puntos >= 0 ? '+' : ''}${prueba.diferencia_puntos} pts frente a reglas`}
                destacado
              />
            </div>

            <div>
              <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wider text-muted">
                Reporte de clasificación (Precision, Recall y F1-Score)
              </p>
              <table className="w-full border-collapse font-body text-sm text-ink">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2">Clase</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1-score</th>
                    <th>Soporte</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-line/60">
                    <td className="py-2.5 font-semibold">No aceptado (0)</td>
                    <td>{(repNo.precision * 100).toFixed(1)}%</td>
                    <td>{(repNo.recall * 100).toFixed(1)}%</td>
                    <td>{(repNo.f1 * 100).toFixed(1)}%</td>
                    <td>{repNo.soporte}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold">Aceptado (1)</td>
                    <td>{(repSi.precision * 100).toFixed(1)}%</td>
                    <td>{(repSi.recall * 100).toFixed(1)}%</td>
                    <td>{(repSi.f1 * 100).toFixed(1)}%</td>
                    <td>{repSi.soporte}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Matriz de confusión */}
          <div className="card flex flex-col gap-4 p-6">
            <div>
              <h3 className="font-body text-sm font-semibold text-ink">Matriz de confusión (conjunto de prueba)</h3>
              <p className="font-body text-xs text-muted">Filas: resultado real · Columnas: predicción del Árbol de Decisión</p>
            </div>

            <div className="grid grid-cols-[auto_1fr_1fr] items-stretch gap-2.5 font-body text-xs">
              <div />
              <div className="py-1 text-center font-semibold text-muted">Predijo: No aceptado</div>
              <div className="py-1 text-center font-semibold text-muted">Predijo: Aceptado</div>

              <div className="flex items-center pr-2 font-semibold text-muted">Real: No aceptado</div>
              <div className="stat flex flex-col items-center justify-center p-4 ring-1 ring-teal/40">
                <span className="font-heading text-3xl font-semibold text-ink">{vn}</span>
                <span className="mt-1 text-[11px] text-muted">Verdaderos negativos</span>
              </div>
              <div className="stat flex flex-col items-center justify-center bg-brand-soft p-4">
                <span className="font-heading text-3xl font-semibold text-brand">{fp}</span>
                <span className="mt-1 text-[11px] text-muted">Falsos positivos</span>
              </div>

              <div className="flex items-center pr-2 font-semibold text-muted">Real: Aceptado</div>
              <div className="stat flex flex-col items-center justify-center bg-brand-soft p-4">
                <span className="font-heading text-3xl font-semibold text-brand">{fn}</span>
                <span className="mt-1 text-[11px] text-muted">Falsos negativos</span>
              </div>
              <div className="stat flex flex-col items-center justify-center p-4 ring-1 ring-teal/40">
                <span className="font-heading text-3xl font-semibold text-ink">{vp}</span>
                <span className="mt-1 text-[11px] text-muted">Verdaderos positivos</span>
              </div>
            </div>
          </div>
        </div>
      </Seccion>

      {/* 4. QUÉ APRENDIÓ EL ÁRBOL */}
      <Seccion
        n="4"
        titulo="Qué patrones aprendió el Árbol de Decisión"
        subtitulo={`Árbol final con max_depth=${arbol.max_depth} y ${arbol.hojas} hojas de decisión. En ${prueba.total_ml_supera_reglas} casos de prueba acertó donde las reglas fijas fallaron.`}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="card flex flex-col gap-4 p-6">
            <h3 className="font-body text-sm font-semibold text-ink">Importancia de cada característica (%)</h3>
            <BarrasH
              items={arbol.importancias.map((i) => [i.nombre, Number((i.importancia * 100).toFixed(1))])}
              color="var(--brand)"
            />
            <details className="mt-2 rounded-xl border border-line bg-canvas px-4 py-3 font-body text-xs text-ink">
              <summary className="cursor-pointer font-semibold">Ver reglas internas del árbol (export_text)</summary>
              <pre className="mt-3 max-h-60 overflow-auto whitespace-pre font-mono text-[11px] leading-relaxed text-muted">
                {arbol.reglas_texto}
              </pre>
            </details>
          </div>

          <div className="card flex flex-col gap-3 overflow-x-auto p-6">
            <h3 className="font-body text-sm font-semibold text-ink">
              Casos de prueba donde Machine Learning acertó y las Reglas Fijas se equivocaron
            </h3>
            <table className="w-full border-collapse font-body text-xs text-ink">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-2">#</th>
                  <th className="px-2">Horas</th>
                  <th className="px-2">Horario</th>
                  <th className="px-2">Skills</th>
                  <th className="px-2">Partic.</th>
                  <th className="px-2">Real</th>
                  <th className="px-2">Reglas</th>
                  <th className="pl-2">ML</th>
                </tr>
              </thead>
              <tbody>
                {prueba.casos_ml_supera_reglas.map((c) => (
                  <tr key={c.indice} className="border-b border-line/60">
                    <td className="py-2 pr-2 text-muted">{c.indice}</td>
                    <td className="px-2">{c.horas_dedicacion}</td>
                    <td className="px-2">{c.compatibilidad_horaria}%</td>
                    <td className="px-2">{c.cobertura_skills}%</td>
                    <td className="px-2">{c.participacion_perfil}</td>
                    <td className="px-2 font-semibold">{c.resultado_real === 1 ? 'Aceptado' : 'No'}</td>
                    <td className="px-2 text-brand">{c.prediccion_reglas === 1 ? 'Aceptado' : 'No'}</td>
                    <td className="pl-2 font-semibold text-teal">
                      {c.prediccion_ml === 1 ? 'Aceptado' : 'No'} ({c.probabilidad_ml}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Seccion>

      {/* 5. GRÁFICAS MATPLOTLIB DEL BACKEND */}
      <Seccion
        n="5"
        titulo="Gráficas generadas en Python con os y matplotlib.pyplot (plt)"
        subtitulo="Guardadas automáticamente en el servidor cada vez que se entrena el modelo y listas para descargar."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <GraficaMatplotlib nombre="profundidad" titulo="1. Exactitud vs max_depth" sello={metricas.entrenado_en} />
          <GraficaMatplotlib nombre="comparacion" titulo="2. Reglas fijas vs Machine Learning" sello={metricas.entrenado_en} />
          <GraficaMatplotlib nombre="matriz" titulo="3. Matriz de confusión" sello={metricas.entrenado_en} />
        </div>
      </Seccion>
    </div>
  )
}
