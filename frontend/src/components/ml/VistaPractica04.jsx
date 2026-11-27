import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { descargarArchivoP04, entrenarP04, getEstadoP04, obtenerArchivoBlobP04 } from '../../services/api'

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

function GraficaAjusteSVG({ comparacion }) {
  const W = 620
  const H = 250
  const padL = 50
  const padR = 28
  const padT = 22
  const padB = 42

  const valores = comparacion.flatMap((c) => [c.entrenamiento, c.validacion])
  const minY = Math.max(0.5, Math.floor(Math.min(...valores) * 20 - 1) / 20)
  const maxY = 1.02
  const spanY = Math.max(0.1, maxY - minY)

  const xDe = (i) => padL + (i / Math.max(1, comparacion.length - 1)) * (W - padL - padR)
  const yDe = (v) => padT + (1 - (v - minY) / spanY) * (H - padT - padB)

  const lineaTrain = comparacion.map((c, i) => `${xDe(i)},${yDe(c.entrenamiento)}`).join(' ')
  const lineaVal = comparacion.map((c, i) => `${xDe(i)},${yDe(c.validacion)}`).join(' ')
  const idxMejor = comparacion.findIndex((c) => c.seleccionado)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Entrenamiento vs Validación según profundidad">
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

      <polyline fill="none" stroke="var(--cocoa)" strokeWidth="2.4" points={lineaTrain} />
      <polyline fill="none" stroke="var(--brand)" strokeWidth="2.8" points={lineaVal} />

      {comparacion.map((c, i) => (
        <g key={c.profundidad}>
          <circle cx={xDe(i)} cy={yDe(c.entrenamiento)} r="4.5" fill="var(--cocoa)" />
          <rect
            x={xDe(i) - 4.5}
            y={yDe(c.validacion) - 4.5}
            width="9"
            height="9"
            rx="1.5"
            fill={c.seleccionado ? 'var(--teal)' : 'var(--brand)'}
          />
          <text x={xDe(i)} y={H - 12} textAnchor="middle" className="fill-ink font-body text-[11px] font-semibold">
            {c.profundidad}
          </text>
        </g>
      ))}
    </svg>
  )
}

function GraficaP04({ nombre, titulo, archivoDescarga, sello }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let revocar = ''
    let cancelado = false
    obtenerArchivoBlobP04(nombre)
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
          onClick={() => descargarArchivoP04(nombre, archivoDescarga)}
          className="inline-flex items-center gap-1 font-body text-xs font-semibold text-brand hover:underline"
        >
          <Download className="h-3.5 w-3.5" /> PNG
        </button>
      </div>
      {url ? (
        <img src={url} alt={titulo} className="w-full rounded-lg border border-line bg-white" />
      ) : (
        <div className="h-48 animate-pulse rounded-lg bg-canvas" />
      )}
    </div>
  )
}

function badgeDiagnostico(estado) {
  if (estado === 'optimo') return 'bg-teal text-white'
  if (estado === 'sobreajuste' || estado === 'subajuste') return 'bg-brand text-on-brand'
  return 'bg-brand-soft text-ink'
}

export default function VistaPractica04() {
  const [metricas, setMetricas] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [cantidad, setCantidad] = useState(500)
  const [semilla, setSemilla] = useState(42)
  const [usarReales, setUsarReales] = useState(true)
  const [entrenando, setEntrenando] = useState(false)

  useEffect(() => {
    let cancelado = false
    getEstadoP04()
      .then((d) => !cancelado && setMetricas(d))
      .catch((err) => !cancelado && setError(err.message))
      .finally(() => !cancelado && setCargando(false))
    return () => {
      cancelado = true
    }
  }, [])

  async function manejarReentrenar(e) {
    e.preventDefault()
    setEntrenando(true)
    setError(null)
    try {
      const nuevo = await entrenarP04({
        cantidad: Number(cantidad),
        semilla: Number(semilla),
        usar_reales: usarReales,
      })
      setMetricas(nuevo)
    } catch (err) {
      setError(err.message)
    } finally {
      setEntrenando(false)
    }
  }

  if (cargando && !metricas) return <div className="card h-64 animate-pulse" aria-busy="true" />
  if (error && !metricas) {
    return <p className="rounded-xl bg-brand-soft p-4 font-body text-sm text-ink">{error}</p>
  }
  if (!metricas) return null

  const { datos, division, comparacion_modelos: comp, modelo_seleccionado: sel, evaluacion_final: ev, validacion_cruzada: cv } = metricas
  const [[vn, fp], [fn, vp]] = ev.matriz_confusion

  return (
    <div className="flex flex-col gap-10">
      {/* 1. CONFIGURACIÓN Y PARTICIÓN 60 / 20 / 20 */}
      <Seccion
        n="1"
        titulo="División estratificada 60% Entrenamiento · 20% Validación · 20% Prueba"
        subtitulo="Entrenamiento aprende patrones, validación selecciona la profundidad sin tocar prueba y prueba mide la capacidad real de generalización."
      >
        <div className="card flex flex-col gap-6 p-6">
          <form onSubmit={manejarReentrenar} className="flex flex-wrap items-end gap-4 border-b border-line pb-5">
            <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-ink">
              Cantidad de postulaciones
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-40 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-sm text-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-ink">
              Semilla (seed)
              <input
                type="number"
                min={0}
                max={99999}
                value={semilla}
                onChange={(e) => setSemilla(e.target.value)}
                className="w-28 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-sm text-ink"
              />
            </label>
            <label className="flex items-center gap-2 pb-2 font-body text-xs font-semibold text-ink">
              <input
                type="checkbox"
                checked={usarReales}
                onChange={(e) => setUsarReales(e.target.checked)}
                className="accent-[var(--brand)]"
              />
              Incluir postulaciones reales cerradas de Linkea
            </label>
            <button
              type="submit"
              disabled={entrenando}
              className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-body text-sm font-semibold text-on-brand disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${entrenando ? 'animate-spin' : ''}`} />
              {entrenando ? 'Evaluando profundidades...' : 'Recalibrar ajuste'}
            </button>

            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => descargarArchivoP04('comparacion_csv', 'p04_comparacion_modelos.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-xs font-semibold text-ink hover:border-brand"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand" /> comparacion_modelos.csv
              </button>
              <button
                type="button"
                onClick={() => descargarArchivoP04('predicciones_csv', 'p04_predicciones_prueba.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-xs font-semibold text-ink hover:border-brand"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal" /> predicciones_prueba.csv
              </button>
            </div>
          </form>

          {error && <p className="font-body text-sm text-brand">{error}</p>}

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Dato
              etiqueta="Dataset total"
              valor={`${datos.filas} casos`}
              detalle={`Reales: ${datos.registros_reales} · Sintéticos: ${datos.registros_sinteticos}`}
            />
            <Dato etiqueta="Entrenamiento (60%)" valor={division.entrenamiento} detalle="Aprende patrones del árbol" destacado />
            <Dato etiqueta="Validación (20%)" valor={division.validacion} detalle="Selecciona mejor max_depth" />
            <Dato etiqueta="Prueba (20%)" valor={division.prueba} detalle="Datos nunca utilizados antes" />
          </dl>
        </div>
      </Seccion>

      {/* 2. DETECCIÓN DE SUBAJUSTE Y SOBREAJUSTE */}
      <Seccion
        n="2"
        titulo="Comparación de profundidades y diagnóstico de ajuste (Subajuste vs Sobreajuste)"
        subtitulo="Se evalúan max_depth en [1, 2, 3, 5, 10, Sin límite]. Un modelo con 100% en entrenamiento pero baja validación sufre sobreajuste."
      >
        <div className="card grid gap-6 p-6 lg:grid-cols-[1.15fr_1.15fr]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 font-body text-xs">
              <span className="font-semibold text-ink">Curva Entrenamiento vs Validación</span>
              <div className="flex flex-wrap gap-4 text-muted">
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-cocoa" /> Entrenamiento</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand" /> Validación</span>
                <span className="font-semibold text-ink">Elegido: {sel.profundidad}</span>
              </div>
            </div>
            <GraficaAjusteSVG comparacion={comp} />
            <p className="rounded-xl border border-line bg-canvas p-3 font-body text-xs leading-relaxed text-muted">
              <b className="text-ink">Observación clave:</b> En profundidades <b className="text-ink">10</b> y{' '}
              <b className="text-ink">Sin límite</b> la curva de entrenamiento sube hasta casi 100%, mientras que la validación
              cae notablemente (brecha &gt; 10%), evidenciando <b className="text-brand">sobreajuste (overfitting)</b>.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-body text-xs text-ink">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-2">Profundidad</th>
                  <th className="px-2">Entren.</th>
                  <th className="px-2">Validación</th>
                  <th className="px-2">Brecha</th>
                  <th className="pl-2">Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {comp.map((fila) => (
                  <tr key={fila.profundidad} className={`border-b border-line/60 ${fila.seleccionado ? 'bg-brand-soft/60' : ''}`}>
                    <td className="py-2.5 pr-2 font-semibold">
                      {fila.profundidad}
                      <span className="ml-1 font-normal text-muted">({fila.hojas} hojas)</span>
                    </td>
                    <td className="px-2">{(fila.entrenamiento * 100).toFixed(2)}%</td>
                    <td className="px-2 font-semibold">{(fila.validacion * 100).toFixed(2)}%</td>
                    <td className="px-2">{(fila.diferencia * 100).toFixed(2)}%</td>
                    <td className="pl-2">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeDiagnostico(fila.estado_ajuste)}`}>
                        {fila.diagnostico}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Seccion>

      {/* 3. EVALUACIÓN EN PRUEBA + MATRIZ + VALIDACIÓN CRUZADA */}
      <Seccion
        n="3"
        titulo={`Evaluación final en Prueba (max_depth=${sel.profundidad}) y Validación Cruzada Estratificada`}
        subtitulo="Rendimiento con el 20% reservado para prueba más estabilidad en 5 particiones StratifiedKFold sobre entrenamiento."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card flex flex-col gap-5 p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato etiqueta="Exactitud" valor={`${(ev.exactitud * 100).toFixed(2)}%`} destacado />
              <Dato etiqueta="Precision" valor={`${(ev.precision * 100).toFixed(2)}%`} />
              <Dato etiqueta="Recall" valor={`${(ev.recall * 100).toFixed(2)}%`} />
              <Dato etiqueta="F1-score" valor={`${(ev.f1_score * 100).toFixed(2)}%`} />
            </div>

            <div className="stat flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted">{cv.metodo}</p>
                <span className="font-heading text-lg font-semibold text-ink">
                  {(cv.promedio * 100).toFixed(2)}% <span className="font-body text-xs text-muted">±{(cv.desviacion_estandar * 100).toFixed(2)}%</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 font-body text-xs">
                {cv.particiones.map((p, idx) => (
                  <span key={idx} className="rounded-lg border border-line bg-canvas px-2.5 py-1 font-medium text-ink">
                    Fold {idx + 1}: {(p * 100).toFixed(2)}%
                  </span>
                ))}
              </div>
              <p className="font-body text-xs text-muted">{cv.nota_metodologica}</p>
            </div>
          </div>

          <div className="card flex flex-col gap-4 p-6">
            <div>
              <h3 className="font-body text-sm font-semibold text-ink">Matriz de confusión en prueba</h3>
              <p className="font-body text-xs text-muted">{ev.desglose_matriz.interpretacion}</p>
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

      {/* 4. GRÁFICAS MATPLOTLIB */}
      <Seccion
        n="4"
        titulo="Gráficas de diagnóstico exportadas por el servidor"
        subtitulo="Generadas automáticamente en Python con matplotlib y listas para descargar."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <GraficaP04
            nombre="comparacion_png"
            titulo="1. Entrenamiento vs Validación por profundidad"
            archivoDescarga="p04_comparacion_modelos.png"
            sello={metricas.entrenado_en}
          />
          <GraficaP04
            nombre="matriz_png"
            titulo="2. Matriz de confusión en prueba"
            archivoDescarga="p04_matriz_confusion.png"
            sello={metricas.entrenado_en}
          />
        </div>
      </Seccion>
    </div>
  )
}
