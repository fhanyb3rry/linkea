import { useEffect, useState } from 'react'
import { Award, Download, FileSpreadsheet, FlaskConical, RefreshCw } from 'lucide-react'
import { descargarArchivoP05, entrenarP05, getEstadoP05, obtenerArchivoBlobP05 } from '../../services/api'

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

function GraficaP05({ nombre, titulo, archivoDescarga, sello }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let revocar = ''
    let cancelado = false
    obtenerArchivoBlobP05(nombre)
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
          onClick={() => descargarArchivoP05(nombre, archivoDescarga)}
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

function TarjetaExperimento({ exp }) {
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-body text-sm font-semibold text-ink">
            <FlaskConical className="h-4 w-4 text-brand" />
            {exp.titulo}
          </h3>
          <p className="mt-1 font-body text-xs text-muted">
            Óptimo experimental: <b className="text-ink">{exp.parametro}={exp.mejor_valor}</b> (F1 {(exp.mejor_f1 * 100).toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-body text-xs text-ink">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-1.5 pr-2">{exp.parametro}</th>
              <th className="px-2">Exactitud</th>
              <th className="px-2">Precision</th>
              <th className="px-2">Recall</th>
              <th className="pl-2">F1-score</th>
            </tr>
          </thead>
          <tbody>
            {exp.resultados.map((r) => {
              const esMejor = r.valor === exp.mejor_valor
              return (
                <tr key={r.valor} className={`border-b border-line/60 ${esMejor ? 'bg-brand-soft/60 font-semibold' : ''}`}>
                  <td className="py-2 pr-2">
                    {r.valor}
                    {esMejor && <span className="ml-1.5 rounded-full bg-teal px-2 py-0.5 text-[10px] text-white">mejor F1</span>}
                  </td>
                  <td className="px-2">{(r.exactitud * 100).toFixed(1)}%</td>
                  <td className="px-2">{(r.precision * 100).toFixed(1)}%</td>
                  <td className="px-2">{(r.recall * 100).toFixed(1)}%</td>
                  <td className="pl-2">{(r.f1_score * 100).toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-auto rounded-xl border border-line bg-canvas p-3 font-body text-xs leading-relaxed text-muted">
        <b className="text-ink">Conclusión: </b>
        {exp.conclusion}
      </p>
    </div>
  )
}

export default function VistaPractica05() {
  const [metricas, setMetricas] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [cantidad, setCantidad] = useState(500)
  const [semilla, setSemilla] = useState(42)
  const [usarReales, setUsarReales] = useState(true)
  const [entrenando, setEntrenando] = useState(false)

  useEffect(() => {
    let cancelado = false
    getEstadoP05()
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
      const nuevo = await entrenarP05({
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
    datos,
    division,
    comparacion_validacion: tabla,
    modelo_seleccionado: sel,
    evaluacion_final: ev,
    validacion_cruzada: cv,
    experimentos,
  } = metricas
  const [[vn, fp], [fn, vp]] = ev.matriz_confusion

  return (
    <div className="flex flex-col gap-10">
      {/* 1. CONFIGURACIÓN Y COMPARACIÓN DE LOS 3 ALGORITMOS EN VALIDACIÓN */}
      <Seccion
        n="1"
        titulo="Comparación de Decision Tree, Random Forest y KNN (con StandardScaler Pipeline)"
        subtitulo="Los tres clasificadores se entrenan con el 60% de entrenamiento, se comparan en el 20% de validación y se elige el ganador por mayor F1-score."
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
              {entrenando ? 'Comparando motores...' : 'Actualizar comparación'}
            </button>

            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => descargarArchivoP05('comparacion_csv', 'p05_resultados_comparacion.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-xs font-semibold text-ink hover:border-brand"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand" /> p05_resultados_comparacion.csv
              </button>
              <button
                type="button"
                onClick={() => descargarArchivoP05('experimentos_csv', 'p05_experimentos.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 font-body text-xs font-semibold text-ink hover:border-brand"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal" /> p05_experimentos.csv
              </button>
            </div>
          </form>

          {error && <p className="font-body text-sm text-brand">{error}</p>}

          <div className="grid gap-4 md:grid-cols-3">
            {tabla.map((alg) => (
              <div
                key={alg.algoritmo}
                className={`stat flex flex-col gap-3 p-5 ${alg.seleccionado ? 'ring-2 ring-teal/60' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading text-xl font-medium text-ink">{alg.algoritmo}</h3>
                  {alg.seleccionado ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal px-2.5 py-0.5 font-body text-[11px] font-semibold text-white">
                      <Award className="h-3.5 w-3.5" /> Ganador F1
                    </span>
                  ) : (
                    <span className="font-body text-xs text-muted">#{alg.posicion}</span>
                  )}
                </div>
                <p className="font-body text-xs text-muted">{alg.descripcion}</p>
                <dl className="mt-auto grid grid-cols-2 gap-2 pt-2 font-body text-xs">
                  <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                    <dt className="text-muted">F1-score (val)</dt>
                    <dd className="font-heading text-lg font-semibold text-ink">{(alg.f1_score * 100).toFixed(2)}%</dd>
                  </div>
                  <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                    <dt className="text-muted">Exactitud (val)</dt>
                    <dd className="font-heading text-lg font-semibold text-ink">{(alg.exactitud * 100).toFixed(2)}%</dd>
                  </div>
                  <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                    <dt className="text-muted">Precision</dt>
                    <dd className="font-semibold text-ink">{(alg.precision * 100).toFixed(2)}%</dd>
                  </div>
                  <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                    <dt className="text-muted">Recall</dt>
                    <dd className="font-semibold text-ink">{(alg.recall * 100).toFixed(2)}%</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <p className="font-body text-xs text-muted">
            Dataset: <b className="text-ink">{datos.filas}</b> postulaciones ({datos.registros_reales} reales, {datos.registros_sinteticos} sintéticas) ·
            Entrenamiento (60%): <b className="text-ink">{division.entrenamiento}</b> · Validación (20%):{' '}
            <b className="text-ink">{division.validacion}</b> · Reentrenamiento ganador (80%):{' '}
            <b className="text-ink">{division.entrenamiento_mas_validacion}</b> · Prueba intacta (20%):{' '}
            <b className="text-ink">{division.prueba}</b>.
          </p>
        </div>
      </Seccion>

      {/* 2. REENTRENAMIENTO 80% + EVALUACIÓN EN PRUEBA 20% + CV */}
      <Seccion
        n="2"
        titulo={`Reentrenamiento al 80% y Evaluación Final en Prueba · ${sel.algoritmo}`}
        subtitulo={`Tras ganar con F1=${(sel.f1_validacion * 100).toFixed(2)}% en validación, se clona y reentrena con ${sel.registros_reentrenamiento} registros (entrenamiento + validación) antes de evaluarse en los ${division.prueba} casos de prueba.`}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card flex flex-col gap-5 p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato etiqueta="Exactitud" valor={`${(ev.exactitud * 100).toFixed(2)}%`} />
              <Dato etiqueta="Precision" valor={`${(ev.precision * 100).toFixed(2)}%`} />
              <Dato etiqueta="Recall" valor={`${(ev.recall * 100).toFixed(2)}%`} />
              <Dato etiqueta="F1-score final" valor={`${(ev.f1_score * 100).toFixed(2)}%`} destacado />
            </div>

            <div className="stat flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted">{cv.metodo}</p>
                <span className="font-heading text-lg font-semibold text-ink">
                  {(cv.promedio_f1 * 100).toFixed(2)}% <span className="font-body text-xs text-muted">±{(cv.desviacion_estandar * 100).toFixed(2)}%</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 font-body text-xs">
                {cv.particiones.map((p, idx) => (
                  <span key={idx} className="rounded-lg border border-line bg-canvas px-2.5 py-1 font-medium text-ink">
                    Fold {idx + 1}: {(p * 100).toFixed(2)}%
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card flex flex-col gap-4 p-6">
            <div>
              <h3 className="font-body text-sm font-semibold text-ink">Matriz de confusión ({sel.algoritmo})</h3>
              <p className="font-body text-xs text-muted">Evaluada sobre el 20% de prueba nunca visto en entrenamiento ni validación</p>
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

      {/* 3. ACTIVIDAD DE MODIFICACIÓN: EXPERIMENTOS A, B Y C */}
      <Seccion
        n="3"
        titulo="Actividad de modificación: Experimentos A, B y C"
        subtitulo="Registro experimental al variar n_neighbors en KNN, n_estimators en Random Forest y max_depth en Decision Tree."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <TarjetaExperimento exp={experimentos.experimento_a} />
          <TarjetaExperimento exp={experimentos.experimento_b} />
          <TarjetaExperimento exp={experimentos.experimento_c} />
        </div>
      </Seccion>

      {/* 4. GRÁFICAS MATPLOTLIB */}
      <Seccion
        n="4"
        titulo="Gráficas comparativas exportadas por el servidor"
        subtitulo="Barras comparativas por motor, matriz de confusión del ganador y curvas de sensibilidad."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <GraficaP05
            nombre="comparacion_png"
            titulo="1. Comparación de algoritmos"
            archivoDescarga="p05_comparacion_algoritmos.png"
            sello={metricas.entrenado_en}
          />
          <GraficaP05
            nombre="matriz_png"
            titulo={`2. Matriz de confusión (${sel.algoritmo})`}
            archivoDescarga="p05_matriz_confusion.png"
            sello={metricas.entrenado_en}
          />
          <GraficaP05
            nombre="experimentos_png"
            titulo="3. Experimentos A, B y C"
            archivoDescarga="p05_experimentos.png"
            sello={metricas.entrenado_en}
          />
        </div>
      </Seccion>
    </div>
  )
}
