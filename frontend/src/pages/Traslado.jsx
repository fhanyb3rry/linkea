import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Clock, RefreshCcw } from 'lucide-react'
import PageTitle from '../components/layout/PageTitle'
import useFetch from '../hooks/useFetch'
import {
  buscarTraslado,
  compararTraslado,
  getTrasladoHeuristica,
  getTrasladoMapa,
  getTrasladoResumen,
  todasLasRutasTraslado,
} from '../services/api'

const ALGORITMOS = [
  { id: 'astar', label: 'A* · g + h' },
  { id: 'greedy', label: 'Greedy · solo h' },
  { id: 'ucs', label: 'UCS · costo real g' },
  { id: 'bfs', label: 'BFS · anchura' },
  { id: 'dfs', label: 'DFS · profundidad' },
]
const SIN_LIMITE = 9

// Dónde va la etiqueta de cada zona (las del centro del valle quedan muy juntas y hay que separarlas).
// Por defecto: nombre arriba del círculo y h abajo.
const ETIQUETA = {
  Metepec: { dx: -17, dy: 22, anchor: 'end' },
  'San Mateo Atenco': { dx: 0, dy: 32, anchor: 'middle' },
  Ocoyoacac: { dx: 17, dy: -3, anchor: 'start' },
  Toluca: { dx: -6, dy: 28, anchor: 'end' },
  Lerma: { dx: 0, dy: -31, anchor: 'middle' },
}

const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-body text-sm text-ink focus:border-cocoa focus:outline-none'

function Ruta({ ruta }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {ruta.map((z, i) => (
        <span key={`${z}-${i}`} className="flex items-center gap-1.5">
          <span className="rounded-md bg-tile px-2 py-1 font-body text-xs font-medium text-ink">{z}</span>
          {i < ruta.length - 1 && <ArrowRight className="h-3 w-3 text-muted" />}
        </span>
      ))}
    </span>
  )
}

// Mapa en SVG: cada zona va donde le toca según su latitud y longitud.
function MapaSVG({ mapa, h, resultado, todas, desde, hasta }) {
  const W = 640
  const H = 430
  const pos = useMemo(() => {
    const lats = mapa.zonas.map((z) => z.lat)
    const lngs = mapa.zonas.map((z) => z.lng)
    const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
    return Object.fromEntries(
      mapa.zonas.map((z) => [
        z.nombre,
        { x: 85 + ((z.lng - minLng) / (maxLng - minLng)) * (W - 170), y: 40 + ((maxLat - z.lat) / (maxLat - minLat)) * (H - 90) },
      ]),
    )
  }, [mapa])

  const ruta = resultado?.camino ?? []
  const enRuta = new Set(ruta.slice(1).map((b, i) => [ruta[i], b].sort().join('|')))
  const explorados = new Set(resultado?.expandidos ?? [])
  const alternativas = new Set(
    (todas?.rutas ?? []).slice(0, 6).flatMap((r) => r.camino.slice(1).map((b, i) => [r.camino[i], b].sort().join('|'))),
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Mapa de zonas con los tiempos de traslado">
      {mapa.tramos.map((t) => {
        const k = [t.a, t.b].sort().join('|')
        const a = pos[t.a]
        const b = pos[t.b]
        const activa = enRuta.has(k)
        return (
          <g key={k}>
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={activa ? 'var(--brand)' : alternativas.has(k) ? 'var(--caramel)' : 'var(--line)'}
              strokeWidth={activa ? 5 : alternativas.has(k) ? 2.5 : 1.5}
              opacity={activa ? 1 : alternativas.has(k) ? 0.6 : 1}
            />
            <rect x={(a.x + b.x) / 2 - 12} y={(a.y + b.y) / 2 - 8} width="24" height="16" rx="4" fill="var(--surface)" opacity="0.92" />
            <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill={activa ? 'var(--brand)' : 'var(--muted)'}>
              {t.minutos}
            </text>
          </g>
        )
      })}
      {mapa.zonas.map((z) => {
        const { x, y } = pos[z.nombre]
        const extremo = z.nombre === desde || z.nombre === hasta
        const delante = ruta.includes(z.nombre)
        return (
          <g key={z.nombre}>
            <circle
              cx={x} cy={y} r="12"
              fill={extremo ? 'var(--brand)' : delante ? 'var(--cocoa)' : 'var(--surface)'}
              stroke={explorados.has(z.nombre) ? 'var(--caramel)' : 'var(--cocoa)'}
              strokeWidth={explorados.has(z.nombre) ? 4 : 1.5}
            />
            {(() => {
              const e = ETIQUETA[z.nombre]
              const [tx, ty, anchor] = e ? [x + e.dx, y + e.dy, e.anchor] : [x, y - 19, 'middle']
              const [hx, hy] = e ? [tx, ty + 12] : [x, y + 27]
              return (
                <>
                  <text x={tx} y={ty} textAnchor={anchor} fontSize="11" fontWeight={extremo ? 700 : 500} fill="var(--ink)">
                    {z.nombre}
                  </text>
                  <text x={hx} y={hy} textAnchor={anchor} fontSize="9.5" fill="var(--muted)">
                    h={h?.[z.nombre] ?? '–'}
                  </text>
                </>
              )
            })()}
          </g>
        )
      })}
    </svg>
  )
}

export default function Traslado() {
  const [params, setParams] = useSearchParams()
  const { data: mapa } = useFetch(getTrasladoMapa)
  const [desde, setDesdeState] = useState(params.get('desde') || 'Zinacantepec')
  const [hasta, setHastaState] = useState(params.get('hasta') || 'Lerma')
  const [algoritmo, setAlgoritmo] = useState('astar')
  const [limite, setLimite] = useState(SIN_LIMITE)

  const zonas = useMemo(() => (mapa ? mapa.zonas.map((z) => z.nombre) : []), [mapa])
  const lim = limite >= SIN_LIMITE ? null : limite
  const ok = Boolean(mapa)

  const setDesde = (v) => {
    setDesdeState(v)
    setParams({ desde: v, hasta })
  }
  const setHasta = (v) => {
    setHastaState(v)
    setParams({ desde, hasta: v })
  }

  const { data: h } = useFetch(() => getTrasladoHeuristica(hasta), [hasta], ok)
  const { data: res, error } = useFetch(() => buscarTraslado({ desde, hasta, algoritmo, limite: lim }), [desde, hasta, algoritmo, lim], ok)
  const { data: comparacion } = useFetch(() => compararTraslado({ desde, hasta, limite: lim }), [desde, hasta, lim], ok)
  const { data: todas } = useFetch(() => todasLasRutasTraslado({ desde, hasta, limite: lim ?? 8 }), [desde, hasta, lim], ok)
  const { data: resumen } = useFetch(getTrasladoResumen)

  const mejor = comparacion ? Math.min(...comparacion.filter((r) => r.encontrado).map((r) => r.costo_real)) : null

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle
        title="Traslado a la vacante"
        subtitle="¿Cuánto tardas en llegar? Mismo problema de «de la casa a la universidad», resuelto con BFS, DFS, UCS, Greedy y A*: costos reales de cada tramo y una heurística que estima lo que falta."
      />

      <div className="card grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr]">
        <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-muted">
          Mi zona (origen)
          <select className={inputCls} value={desde} onChange={(e) => setDesde(e.target.value)}>
            {zonas.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-muted">
          Zona de la vacante (destino)
          <select className={inputCls} value={hasta} onChange={(e) => setHasta(e.target.value)}>
            {zonas.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-muted">
          Algoritmo
          <select className={inputCls} value={algoritmo} onChange={(e) => setAlgoritmo(e.target.value)}>
            {ALGORITMOS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-muted">
          Límite de profundidad: {lim ?? 'sin límite'}
          <input type="range" min="1" max={SIN_LIMITE} value={limite} onChange={(e) => setLimite(Number(e.target.value))} className="mt-2 accent-[var(--brand)]" />
        </label>
      </div>

      {error && <p className="font-body text-sm text-brand">{error}</p>}

      {mapa && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="card p-4">
            <MapaSVG mapa={mapa} h={h} resultado={res} todas={todas} desde={desde} hasta={hasta} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 font-body text-xs text-muted">
              <span><b className="text-brand">━</b> ruta del algoritmo</span>
              <span><b className="text-caramel">━</b> otras rutas posibles</span>
              <span><b className="text-caramel">◯</b> zona explorada</span>
              <span>número en la línea = minutos reales · h = minutos estimados hasta el destino</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="card flex flex-col gap-3 p-6">
              <h2 className="flex items-center gap-2 text-xl font-medium">
                <Clock className="h-5 w-5 text-brand" />
                {res?.encontrado ? `${res.costo_real} min reales` : 'Sin ruta'}
              </h2>
              {res && (
                <>
                  {res.encontrado ? <Ruta ruta={res.camino} /> : (
                    <p className="font-body text-sm text-muted">No hay ruta dentro del límite de profundidad. Prueba subirlo.</p>
                  )}
                  <dl className="grid grid-cols-3 gap-2 font-body text-xs">
                    <div className="tile p-3"><dt className="text-muted">Estimado (h)</dt><dd className="mt-1 text-base font-semibold text-ink">{res.costo_estimado} min</dd></div>
                    <div className="tile p-3"><dt className="text-muted">Tramos</dt><dd className="mt-1 text-base font-semibold text-ink">{res.aristas}</dd></div>
                    <div className="tile p-3"><dt className="text-muted">Zonas exploradas</dt><dd className="mt-1 text-base font-semibold text-ink">{res.cantidad_expandidos}</dd></div>
                  </dl>
                  <p className="font-body text-xs text-muted">
                    Orden de exploración (no es lo mismo que la ruta encontrada):
                  </p>
                  <ol className="flex flex-wrap gap-1.5">
                    {res.expandidos.map((z, i) => (
                      <li key={i} className="rounded-md bg-tile px-2 py-1 font-body text-xs text-ink"><span className="text-muted">{i + 1}.</span> {z}</li>
                    ))}
                  </ol>
                  <p className="font-body text-xs text-muted">
                    Contra ciclos: {res.mecanismo_ciclos}. Repetidos evitados: <b>{res.ciclos_evitados.length}</b>
                    {res.ciclos_evitados[0] && <> (ej.: {res.ciclos_evitados[0].join(' → ')})</>}.
                  </p>
                </>
              )}
            </div>

            {mapa.heuristica && (
              <div className="card flex items-start gap-3 p-5">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
                <p className="font-body text-xs leading-relaxed text-muted">
                  <b className="text-ink">Heurística {mapa.heuristica.admisible ? 'admisible' : 'NO admisible'}
                  {mapa.heuristica.consistente ? ' y consistente' : ''}.</b> h es la distancia en línea recta convertida a minutos
                  con la velocidad del tramo más rápido ({mapa.velocidad_max_kmh} km/h), así que nunca promete más de lo real
                  (revisado en {mapa.heuristica.pares_revisados} combinaciones). Los tiempos del mapa son de ejemplo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {comparacion && (
        <div className="card flex flex-col gap-3 p-6">
          <h2 className="flex items-center gap-2 text-xl font-medium"><RefreshCcw className="h-5 w-5 text-brand" /> Los 5 algoritmos, mismo origen y destino</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse font-body text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2 pr-3">Algoritmo</th><th className="pr-3">Ruta encontrada</th><th className="pr-3">Minutos reales</th>
                  <th className="pr-3">Tramos</th><th>Zonas exploradas</th>
                </tr>
              </thead>
              <tbody>
                {comparacion.map((r) => (
                  <tr key={r.algoritmo} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-3 font-semibold text-ink">{r.algoritmo}</td>
                    <td className="pr-3 py-2">{r.encontrado ? <Ruta ruta={r.camino} /> : <span className="text-muted">Sin ruta</span>}</td>
                    <td className={`pr-3 ${r.encontrado && r.costo_real === mejor ? 'font-semibold text-teal' : 'text-ink'}`}>
                      {r.encontrado ? r.costo_real : '—'}{r.encontrado && r.costo_real === mejor ? ' ✓ mínimo' : ''}
                    </td>
                    <td className="pr-3 text-ink">{r.aristas}</td>
                    <td className="text-ink">{r.cantidad_expandidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-body text-xs text-muted">
            BFS cuenta tramos, DFS se mete lo más hondo, UCS mira solo g(n), Greedy solo h(n) y A* mira f(n) = g(n) + h(n).
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {todas && (
          <div className="card flex flex-col gap-3 p-6">
            <h2 className="text-xl font-medium">Todas las rutas posibles ({todas.rutas.length})</h2>
            <p className="font-body text-xs text-muted">
              Backtracking sin ciclos (set en_camino), de la más rápida a la más lenta. Ciclos evitados: {todas.ciclos_evitados.length} ·
              ramas cortadas por el límite: {todas.podados_por_limite}.
            </p>
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {todas.rutas.map((r, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="font-body text-xs font-semibold text-muted">Ruta {i + 1} · {r.minutos} min · {r.aristas} tramos</span>
                  <Ruta ruta={r.camino} />
                </div>
              ))}
              {todas.rutas.length === 0 && <p className="font-body text-sm text-muted">Ninguna ruta cabe en el límite.</p>}
            </div>
          </div>
        )}

        {resumen && (
          <div className="card flex flex-col gap-3 p-6">
            <h2 className="text-xl font-medium">¿Sirve la heurística?</h2>
            <p className="font-body text-xs text-muted">
              Corrimos los 5 algoritmos en las {resumen.pares} combinaciones de zonas del mapa.
            </p>
            <table className="w-full border-collapse font-body text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2">Algoritmo</th><th>Rutas no óptimas</th><th>Zonas exploradas (promedio)</th>
                </tr>
              </thead>
              <tbody>
                {resumen.algoritmos.map((a) => (
                  <tr key={a.algoritmo} className="border-b border-line/60">
                    <td className="py-2 font-semibold text-ink">{a.algoritmo}</td>
                    <td className={a.no_optimas === 0 ? 'text-teal' : 'text-ink'}>{a.no_optimas}</td>
                    <td className="text-ink">{a.expandidos_promedio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="font-body text-xs leading-relaxed text-muted">
              A* nunca falla y explora menos que UCS, BFS y DFS. Greedy explora aún menos, pero a veces se equivoca de ruta.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
