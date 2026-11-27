import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass, Download, Eye, FileSpreadsheet, RefreshCw, Sparkles, UserCheck } from 'lucide-react'
import {
  descargarArchivoSeg,
  getAuditoriaSegmentacion,
  getPanoramaEstudiantes,
  obtenerArchivoBlobSeg,
  recalibrarSegmentacion,
} from '../../services/api'

const COLOR_ETAPA = {
  listo: 'var(--teal)',
  intermedio: 'var(--caramel)',
  acompanamiento: 'var(--brand)',
}

function MapaGeneracionSVG({ puntos, onSeleccionar, seleccionado }) {
  if (!puntos?.length) return null
  const W = 680
  const H = 340
  const pad = 42

  const xs = puntos.map((p) => p.x)
  const ys = puntos.map((p) => p.y)
  const minX = Math.min(...xs) - 0.35
  const maxX = Math.max(...xs) + 0.35
  const minY = Math.min(...ys) - 0.35
  const maxY = Math.max(...ys) + 0.35

  const xDe = (v) => pad + ((v - minX) / Math.max(0.5, maxX - minX)) * (W - pad * 2)
  const yDe = (v) => H - pad - ((v - minY) / Math.max(0.5, maxY - minY)) * (H - pad * 2)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-canvas" role="img" aria-label="Mapa visual de preparación de estudiantes">
      <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke="var(--line)" strokeDasharray="4 4" />
      <line x1={W / 2} y1={pad} x2={W / 2} y2={H - pad} stroke="var(--line)" strokeDasharray="4 4" />

      <text x={W / 2} y={H - 10} textAnchor="middle" className="fill-muted font-body text-[11px]">
        ← Menor preparación global · Mayor preparación global →
      </text>
      <text
        x={14}
        y={H / 2}
        textAnchor="middle"
        transform={`rotate(-90 14 ${H / 2})`}
        className="fill-muted font-body text-[11px]"
      >
        Balance tiempo semanal vs portafolio
      </text>

      {puntos
        .filter((p) => !p.es_real)
        .map((p) => (
          <circle
            key={p.id}
            cx={xDe(p.x)}
            cy={yDe(p.y)}
            r="4"
            fill={COLOR_ETAPA[p.codigo_etapa] ?? 'var(--caramel)'}
            opacity="0.22"
          />
        ))}

      {puntos
        .filter((p) => p.es_real)
        .map((p) => {
          const activo = seleccionado?.id === p.id
          return (
            <g key={p.id} onClick={() => onSeleccionar(p)} className="cursor-pointer">
              {p.es_singular && (
                <circle
                  cx={xDe(p.x)}
                  cy={yDe(p.y)}
                  r="11"
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
              )}
              <circle
                cx={xDe(p.x)}
                cy={yDe(p.y)}
                r={activo ? 8 : 6.5}
                fill={COLOR_ETAPA[p.codigo_etapa] ?? 'var(--teal)'}
                stroke="var(--surface)"
                strokeWidth="2"
              />
              <title>{`${p.nombre} · ${p.etapa}`}</title>
            </g>
          )
        })}
    </svg>
  )
}

function GraficaSeg({ practica, nombre, titulo, archivoDescarga, sello }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let revocar = ''
    let cancelado = false
    obtenerArchivoBlobSeg(practica, nombre)
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
  }, [practica, nombre, sello])

  return (
    <div className="stat flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-xs font-semibold text-ink">{titulo}</p>
        <button
          type="button"
          onClick={() => descargarArchivoSeg(practica, nombre, archivoDescarga)}
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

export default function AcompanamientoMapa() {
  const [panorama, setPanorama] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)

  const [modo, setModo] = useState('panorama')
  const [auditoria, setAuditoria] = useState(null)
  const [recalibrando, setRecalibrando] = useState(false)

  useEffect(() => {
    let cancelado = false
    getPanoramaEstudiantes()
      .then((d) => {
        if (cancelado) return
        setPanorama(d)
        const primerReal = d?.mapa?.find((p) => p.es_real)
        if (primerReal) setSeleccionado(primerReal)
      })
      .catch((err) => !cancelado && setError(err.message))
      .finally(() => !cancelado && setCargando(false))
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (modo === 'panorama' || auditoria) return undefined
    let cancelado = false
    getAuditoriaSegmentacion()
      .then((d) => !cancelado && setAuditoria(d))
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [modo, auditoria])

  async function manejarRecalibrar() {
    setRecalibrando(true)
    try {
      const nuevo = await recalibrarSegmentacion({ usar_reales: true })
      setAuditoria(nuevo)
      const pan = await getPanoramaEstudiantes()
      setPanorama(pan)
    } catch (err) {
      setError(err.message)
    } finally {
      setRecalibrando(false)
    }
  }

  if (cargando && !panorama) return <div className="card h-64 animate-pulse" aria-busy="true" />
  if (error && !panorama) return <p className="rounded-xl bg-brand-soft p-4 font-body text-sm text-ink">{error}</p>
  if (!panorama) return null

  const { resumen, singulares, mapa } = panorama

  return (
    <div className="flex flex-col gap-6">
      {/* Selector entre panorama institucional y auditoría técnica */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-line bg-surface p-1">
          {[
            ['panorama', 'Panorama de acompañamiento'],
            ['agrupamiento', 'Auditoría: Agrupamiento y grupos'],
            ['estabilidad', 'Auditoría: Estabilidad y singulares'],
            ['mapa_pca', 'Auditoría: Compresión 2D / 3D'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setModo(id)}
              className={`rounded-xl px-3.5 py-1.5 font-body text-xs font-semibold transition-colors ${
                modo === id ? 'bg-brand text-on-brand' : 'text-ink hover:bg-brand-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {modo !== 'panorama' && (
          <button
            type="button"
            disabled={recalibrando}
            onClick={manejarRecalibrar}
            className="inline-flex items-center gap-2 rounded-xl bg-cocoa px-4 py-2 font-body text-xs font-semibold text-on-cocoa disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recalibrando ? 'animate-spin' : ''}`} />
            {recalibrando ? 'Recalculando...' : 'Recalibrar con estudiantes actuales'}
          </button>
        )}
      </div>

      {/* MODO 1: PANORAMA HUMANO DE ACOMPAÑAMIENTO Y MAPA VISUAL */}
      {modo === 'panorama' && (
        <div className="flex flex-col gap-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="stat px-4 py-3 ring-1 ring-teal/40">
              <dt className="font-body text-xs uppercase tracking-wider text-muted">Listos para estadía</dt>
              <dd className="mt-1 font-heading text-2xl font-medium text-ink">{resumen.conteos.listo ?? 0}</dd>
              <p className="mt-0.5 font-body text-xs text-muted">Buen respaldo de horas, habilidades y CV</p>
            </div>
            <div className="stat px-4 py-3">
              <dt className="font-body text-xs uppercase tracking-wider text-muted">En preparación intermedia</dt>
              <dd className="mt-1 font-heading text-2xl font-medium text-ink">{resumen.conteos.intermedio ?? 0}</dd>
              <p className="mt-0.5 font-body text-xs text-muted">A un paso de completar su perfil</p>
            </div>
            <div className="stat px-4 py-3">
              <dt className="font-body text-xs uppercase tracking-wider text-muted">Conviene acompañamiento</dt>
              <dd className="mt-1 font-heading text-2xl font-medium text-ink">{resumen.conteos.acompanamiento ?? 0}</dd>
              <p className="mt-0.5 font-body text-xs text-muted">Prioritarios para orientación con asesoría</p>
            </div>
            <div className="stat px-4 py-3 bg-brand-soft/60">
              <dt className="font-body text-xs uppercase tracking-wider text-brand">Perfiles fuera de lo habitual</dt>
              <dd className="mt-1 font-heading text-2xl font-medium text-ink">{resumen.total_singulares}</dd>
              <p className="mt-0.5 font-body text-xs text-muted">Combinaciones poco comunes para revisar</p>
            </div>
          </dl>

          <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
            <div className="card flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 font-heading text-xl font-medium text-ink">
                    <Compass className="h-5 w-5 text-brand" />
                    Mapa visual de preparación estudiantil
                  </h3>
                  <p className="mt-0.5 font-body text-xs text-muted">
                    Resume el {resumen.informacion_mapa_pct}% de la información de los perfiles en dos ejes fáciles de leer. Haz clic en cualquier estudiante.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 font-body text-xs text-muted">
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-teal" /> Listo</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-caramel" /> En preparación</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-brand" /> Acompañamiento</span>
                </div>
              </div>

              <MapaGeneracionSVG puntos={mapa} seleccionado={seleccionado} onSeleccionar={setSeleccionado} />

              {seleccionado && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3.5 font-body text-xs">
                  <div>
                    <p className="font-semibold text-ink">{seleccionado.nombre}</p>
                    <p className="text-muted">
                      {seleccionado.carrera} · <b className="text-ink">{seleccionado.etapa}</b>
                    </p>
                  </div>
                  <Link
                    to={`/estudiantes/${seleccionado.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 font-semibold text-ink hover:border-brand hover:text-brand"
                  >
                    <Eye className="h-3.5 w-3.5" /> Abrir perfil
                  </Link>
                </div>
              )}
            </div>

            <div className="card flex flex-col gap-4 p-6">
              <div>
                <h3 className="flex items-center gap-2 font-heading text-xl font-medium text-ink">
                  <UserCheck className="h-5 w-5 text-brand" />
                  Revisión personalizada sugerida
                </h3>
                <p className="mt-0.5 font-body text-xs text-muted">
                  No significa bajo desempeño: son perfiles con una combinación poco habitual respecto a compañeros de su misma etapa.
                </p>
              </div>

              {singulares.length === 0 ? (
                <p className="rounded-xl bg-canvas p-4 font-body text-xs text-muted">
                  Actualmente todos los estudiantes registrados siguen patrones habituales dentro de su etapa.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {singulares.slice(0, 6).map((s) => (
                    <li key={s.student_id} className="stat flex flex-col gap-1.5 p-3.5 font-body text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <Link to={`/estudiantes/${s.student_id}`} className="font-semibold text-ink hover:text-brand">
                          {s.nombre}
                        </Link>
                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">
                          {s.etapa}
                        </span>
                      </div>
                      <p className="leading-relaxed text-muted">{s.motivo_singular}</p>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                to="/estudiantes"
                className="mt-auto inline-flex items-center gap-1.5 font-body text-xs font-semibold text-brand hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5" /> Filtrar directorio completo de estudiantes por etapa →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODO 2: AUDITORÍA K-MEANS (P07) */}
      {modo === 'agrupamiento' && auditoria?.p07 && (
        <div className="card flex flex-col gap-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h3 className="font-heading text-xl font-medium text-ink">Descubrimiento de etapas con K-Means (K={auditoria.p07.modelo_final.k})</h3>
              <p className="font-body text-xs text-muted">
                Inercia final: {auditoria.p07.modelo_final.inercia} · Silhouette con StandardScaler:{' '}
                <b>{auditoria.p07.escalamiento.silhouette_con_escalador}</b> (sin escalar:{' '}
                {auditoria.p07.escalamiento.silhouette_sin_escalador})
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => descargarArchivoSeg('p07', 'segmentados_csv', 'p07_estudiantes_segmentados.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 font-body text-xs font-semibold text-ink"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand" /> estudiantes_segmentados.csv
              </button>
              <button
                type="button"
                onClick={() => descargarArchivoSeg('p07', 'perfiles_csv', 'p07_perfiles_academicos.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 font-body text-xs font-semibold text-ink"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal" /> perfiles_academicos.csv
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {auditoria.p07.modelo_final.grupos.map((g) => (
              <div key={g.cluster} className="stat flex flex-col gap-2 p-4 font-body text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{g.perfil}</span>
                  <span className="text-muted">{g.cantidad} ({g.porcentaje}%)</span>
                </div>
                <p className="text-muted">Dedicación prom.: <b className="text-ink">{g.promedios.horas_disponibles}</b> / 12</p>
                <p className="text-muted">Avance prom.: <b className="text-ink">{g.promedios.avance_academico}%</b></p>
                <p className="text-muted">Portafolio prom.: <b className="text-ink">{g.promedios.evidencias_portafolio}</b> / 30</p>
                <p className="text-muted">Habilidades prom.: <b className="text-ink">{g.promedios.dominio_habilidades}%</b></p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <GraficaSeg practica="p07" nombre="codo_png" titulo="1. Método del codo (K=1..8)" archivoDescarga="p07_metodo_del_codo.png" sello={auditoria.p07.entrenado_en} />
            <GraficaSeg practica="p07" nombre="silhouette_png" titulo="2. Silhouette Score (K=2..8)" archivoDescarga="p07_silhouette.png" sello={auditoria.p07.entrenado_en} />
            <GraficaSeg practica="p07" nombre="segmentacion_png" titulo="3. Segmentos y centroides" archivoDescarga="p07_segmentacion_estudiantes.png" sello={auditoria.p07.entrenado_en} />
          </div>
        </div>
      )}

      {/* MODO 3: AUDITORÍA ESTABILIDAD ARI Y ATÍPICOS P95 (P08) */}
      {modo === 'estabilidad' && auditoria?.p08 && (
        <div className="card flex flex-col gap-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h3 className="font-heading text-xl font-medium text-ink">
                Consistencia ARI ({auditoria.p08.estabilidad_ari.promedio_ari}), Escaladores y Umbral P{auditoria.p08.atipicos.percentil}
              </h3>
              <p className="font-body text-xs text-muted">
                Coincidencia StandardScaler vs MinMaxScaler (ARI): <b>{auditoria.p08.escaladores.ari_coincidencia_entre_escaladores}</b> ·
                Umbral de distancia: <b>{auditoria.p08.atipicos.umbral_distancia}</b> ({auditoria.p08.atipicos.total_candidatos} casos)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => descargarArchivoSeg('p08', 'reporte_csv', 'p08_reporte_integral.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 font-body text-xs font-semibold text-ink"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand" /> reporte_integral.csv
              </button>
              <button
                type="button"
                onClick={() => descargarArchivoSeg('p08', 'atipicos_csv', 'p08_posibles_atipicos.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 font-body text-xs font-semibold text-ink"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal" /> posibles_atipicos.csv
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <GraficaSeg practica="p08" nombre="inicializaciones_png" titulo="k-means++ vs random" archivoDescarga="p08_inicializaciones.png" sello={auditoria.p08.entrenado_en} />
            <GraficaSeg practica="p08" nombre="escaladores_png" titulo="StandardScaler vs MinMax" archivoDescarga="p08_escaladores.png" sello={auditoria.p08.entrenado_en} />
            <GraficaSeg practica="p08" nombre="estabilidad_png" titulo="Matriz ARI entre semillas" archivoDescarga="p08_matriz_estabilidad.png" sello={auditoria.p08.entrenado_en} />
            <GraficaSeg practica="p08" nombre="distancias_png" titulo="Distancias al centroide (P95)" archivoDescarga="p08_distancias_atipicos.png" sello={auditoria.p08.entrenado_en} />
          </div>
        </div>
      )}

      {/* MODO 4: AUDITORÍA PCA 2D / 3D Y VARIANZA (P09) */}
      {modo === 'mapa_pca' && auditoria?.p09 && (
        <div className="card flex flex-col gap-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h3 className="font-heading text-xl font-medium text-ink">
                Componentes Principales (PCA) · {auditoria.p09.seleccion_componentes.varianza_2d}% de varianza en 2D
              </h3>
              <p className="font-body text-xs text-muted">
                Componentes para superar {auditoria.p09.seleccion_componentes.varianza_objetivo}%:{' '}
                <b>{auditoria.p09.seleccion_componentes.componentes_seleccionadas}</b> · Error de reconstrucción (MSE):{' '}
                <b>{auditoria.p09.seleccion_componentes.mse_reconstruccion}</b>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => descargarArchivoSeg('p09', 'varianza_csv', 'p09_varianza_explicada.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 font-body text-xs font-semibold text-ink"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand" /> varianza_explicada.csv
              </button>
              <button
                type="button"
                onClick={() => descargarArchivoSeg('p09', 'coordenadas_csv', 'p09_coordenadas_pca.csv')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 font-body text-xs font-semibold text-ink"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal" /> coordenadas_pca.csv
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-body text-xs text-ink">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-2">Componente</th>
                  <th className="px-2">Varianza explicada</th>
                  <th className="pl-2">Varianza acumulada</th>
                </tr>
              </thead>
              <tbody>
                {auditoria.p09.varianza.map((v) => (
                  <tr key={v.componente} className="border-b border-line/60">
                    <td className="py-2 pr-2 font-semibold">{v.componente}</td>
                    <td className="px-2">{v.porcentaje_explicado}%</td>
                    <td className="pl-2 font-semibold">{v.porcentaje_acumulado}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <GraficaSeg practica="p09" nombre="acumulada_png" titulo="Varianza acumulada" archivoDescarga="p09_varianza_acumulada.png" sello={auditoria.p09.entrenado_en} />
            <GraficaSeg practica="p09" nombre="cargas_png" titulo="Cargas de variables (Loadings)" archivoDescarga="p09_cargas_componentes.png" sello={auditoria.p09.entrenado_en} />
            <GraficaSeg practica="p09" nombre="pca2d_png" titulo="Proyección 2D (PC1 vs PC2)" archivoDescarga="p09_pca_2d.png" sello={auditoria.p09.entrenado_en} />
            <GraficaSeg practica="p09" nombre="pca3d_png" titulo="Proyección 3D (PC1, PC2, PC3)" archivoDescarga="p09_pca_3d.png" sello={auditoria.p09.entrenado_en} />
          </div>
        </div>
      )}
    </div>
  )
}
