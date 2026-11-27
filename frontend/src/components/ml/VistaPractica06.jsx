import { useEffect, useState } from 'react'
import { Award, Download, FileSpreadsheet, RefreshCw, Sliders } from 'lucide-react'
import { descargarArchivoP06, entrenarP06, getEstadoP06, obtenerArchivoBlobP06 } from '../../services/api'

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

function GraficaP06({ nombre, titulo, archivoDescarga, sello }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let revocar = ''
    let cancelado = false
    obtenerArchivoBlobP06(nombre)
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
          onClick={() => descargarArchivoP06(nombre, archivoDescarga)}
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

export default function VistaPractica06() {
  const [metricas, setMetricas] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [cantidad, setCantidad] = useState(500)
  const [semilla, setSemilla] = useState(42)
  const [usarReales, setUsarReales] = useState(true)
  const [entrenando, setEntrenando] = useState(false)

  useEffect(() => {
    let cancelado = false
    getEstadoP06()
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
      const nuevo = await entrenarP06({
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

  const {
    division,
    gridsearch,
    comparacion_metodos: comp,
    modelo_seleccionado: sel,
    evaluacion_final: ev,
  } = metricas
  const [[vn, fp], [fn, vp]] = ev.matriz_confusion

  return (
    <div className="flex flex-col gap-10">
      <Seccion
        n="1"
        titulo="Búsqueda exhaustiva (GridSearchCV) vs aleatoria (RandomizedSearchCV)"
        subtitulo={`Se explora el espacio de hiperparámetros con ${division.estrategia_cv} sobre el 80% (${division.entrenamiento_cv} casos) dejando intacto el 20% (${division.prueba}) para la evaluación final.`}
      >
        <div className="card flex flex-col gap-6 p-6">
          <form onSubmit={manejarReentrenar} className="flex flex-wrap items-end gap-4 border-b border-line pb-5">
            <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-ink">
              Cantidad de registros
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-36 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-sm text-ink"
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
              Incluir postulaciones reales cerradas
            </label>
            <button
              type="submit"
              disabled={entrenando}
              className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-body text-sm font-semibold text-on-brand disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${entrenando ? 'animate-spin' : ''}`} />
              {entrenando ? 'Optimizando hiperparámetros...' : 'Reoptimizar motores'}
            </button>

            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => descargarArchivoP06('grid_csv', 'p06_resultados_gridsearch.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-xs font-semibold text-ink hover:border-brand"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand" /> gridsearch.csv
              </button>
              <button
                type="button"
                onClick={() => descargarArchivoP06('random_csv', 'p06_resultados_randomizedsearch.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-xs font-semibold text-ink hover:border-brand"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal" /> randomizedsearch.csv
              </button>
              <button
                type="button"
                onClick={() => descargarArchivoP06('comparacion_csv', 'p06_comparacion_metodos.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-xs font-semibold text-ink hover:border-brand"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-cocoa" /> comparacion.csv
              </button>
            </div>
          </form>

          {error && <p className="font-body text-sm text-brand">{error}</p>}

          <div className="grid gap-4 lg:grid-cols-3">
            {gridsearch.map((g) => {
              const filaComp = comp.find((c) => c.algoritmo === g.algoritmo)
              const esCampeon = g.algoritmo === sel.algoritmo
              return (
                <div
                  key={g.algoritmo}
                  className={`stat flex flex-col gap-3 p-5 ${esCampeon ? 'ring-2 ring-teal/60' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 font-heading text-xl font-medium text-ink">
                      <Sliders className="h-4 w-4 text-brand" />
                      {g.algoritmo}
                    </h3>
                    {esCampeon && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal px-2.5 py-0.5 font-body text-[11px] font-semibold text-white">
                        <Award className="h-3.5 w-3.5" /> Campeón
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-body text-xs">
                    <div className="rounded-lg bg-canvas px-2.5 py-2">
                      <p className="text-muted">GridSearchCV ({g.combinaciones} comb.)</p>
                      <p className="mt-0.5 font-heading text-lg font-semibold text-ink">
                        {(g.mejor_f1 * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-canvas px-2.5 py-2">
                      <p className="text-muted">RandomizedSearch (20 it.)</p>
                      <p className="mt-0.5 font-heading text-lg font-semibold text-ink">
                        {filaComp ? `${(filaComp.randomizedsearch * 100).toFixed(2)}%` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto rounded-xl border border-line bg-canvas p-3 font-body text-xs">
                    <p className="mb-1 font-semibold text-ink">Mejores hiperparámetros hallados:</p>
                    <ul className="flex flex-col gap-0.5 text-muted">
                      {Object.entries(g.hiperparametros_dict).map(([k, v]) => (
                        <li key={k}>
                          <b className="text-ink">{k.replace('clasificador__', '')}:</b> {v === null ? 'Sin límite' : String(v)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Seccion>

      <Seccion
        n="2"
        titulo={`Evaluación en Prueba del Modelo Optimizado · ${sel.algoritmo}`}
        subtitulo="Este modelo optimizado queda conectado automáticamente al pronóstico en vivo de vacantes, candidatos y simulador."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card flex flex-col gap-5 p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato etiqueta="Accuracy" valor={`${(ev.exactitud * 100).toFixed(2)}%`} />
              <Dato etiqueta="Precision" valor={`${(ev.precision * 100).toFixed(2)}%`} />
              <Dato etiqueta="Recall" valor={`${(ev.recall * 100).toFixed(2)}%`} />
              <Dato etiqueta="F1-score final" valor={`${(ev.f1_score * 100).toFixed(2)}%`} destacado />
            </div>

            <div className="stat flex flex-col gap-2 p-4 font-body text-xs text-muted">
              <p className="font-semibold text-ink">Por qué mejora el pronóstico de Linkea</p>
              <p className="leading-relaxed">
                En vez de usar valores manuales arbitrarios, GridSearchCV verificó sistemáticamente cada combinación en 5
                particiones estratificadas antes de elegir la configuración que alimenta las recomendaciones a estudiantes y empresas.
              </p>
            </div>
          </div>

          <div className="card flex flex-col gap-4 p-6">
            <h3 className="font-body text-sm font-semibold text-ink">Matriz de confusión en prueba ({sel.algoritmo})</h3>
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

      <Seccion
        n="3"
        titulo="Gráficas de optimización exportadas por el servidor"
        subtitulo="Generadas en Python con matplotlib y listas para descarga."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <GraficaP06
            nombre="comparacion_png"
            titulo="1. GridSearchCV vs RandomizedSearchCV"
            archivoDescarga="p06_comparacion_optimizacion.png"
            sello={metricas.entrenado_en}
          />
          <GraficaP06
            nombre="matriz_png"
            titulo={`2. Matriz de confusión optimizada (${sel.algoritmo})`}
            archivoDescarga="p06_matriz_confusion.png"
            sello={metricas.entrenado_en}
          />
        </div>
      </Seccion>
    </div>
  )
}
