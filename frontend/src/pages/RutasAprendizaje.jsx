import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, RefreshCcw, Route as RouteIcon } from 'lucide-react'
import PageTitle from '../components/layout/PageTitle'
import useActiveStudent from '../hooks/useActiveStudent'
import useFetch from '../hooks/useFetch'
import { buscarRutas, getGrafoSkills, getPlanAprendizaje, getVacancies } from '../services/api'

const ALGORITMOS = [
  { id: 'dfs_todas', label: 'DFS · todas las rutas' },
  { id: 'dfs', label: 'DFS · primera ruta' },
  { id: 'bfs', label: 'BFS · ruta más corta' },
]

const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-body text-sm text-ink focus:border-cocoa focus:outline-none'

function Flecha({ ruta }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {ruta.map((n, i) => (
        <span key={`${n}-${i}`} className="flex items-center gap-1.5">
          <span className="chip px-2 py-1 font-body text-xs font-medium text-ink">{n}</span>
          {i < ruta.length - 1 && <ArrowRight className="h-3 w-3 text-muted" />}
        </span>
      ))}
    </span>
  )
}

// Dibuja el grafo en círculo (SVG): ruta más corta en vino, el resto de rutas en caramelo.
function GrafoSVG({ grafo, rutas, inicio, objetivo }) {
  const nombres = Object.keys(grafo)
  const R = 215
  const pos = Object.fromEntries(
    nombres.map((n, i) => {
      const a = (2 * Math.PI * i) / nombres.length - Math.PI / 2
      return [n, { x: 300 + R * Math.cos(a), y: 260 + R * Math.sin(a) }]
    }),
  )
  const aristas = (ruta) => ruta.slice(1).map((b, i) => [ruta[i], b])
  const mejor = rutas.length ? rutas.reduce((a, b) => (b.length < a.length ? b : a)) : []
  const enMejor = new Set(mejor)

  return (
    <svg viewBox="0 0 600 520" className="w-full" role="img" aria-label="Grafo de habilidades con las rutas encontradas">
      {nombres.flatMap((a) =>
        grafo[a].filter((b) => a < b).map((b) => (
          <line key={`${a}-${b}`} x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y} stroke="var(--line)" strokeWidth="1" />
        )),
      )}
      {rutas.slice(0, 12).flatMap((r, ri) =>
        aristas(r).map(([a, b], i) => (
          <line key={`r${ri}-${i}`} x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y} stroke="var(--caramel)" strokeWidth="2.5" opacity="0.75" />
        )),
      )}
      {aristas(mejor).map(([a, b], i) => (
        <line key={`m${i}`} x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y} stroke="var(--brand)" strokeWidth="4.5" />
      ))}
      {nombres.map((n) => {
        const { x, y } = pos[n]
        const extremo = n === inicio || n === objetivo
        const derecha = x > 305
        return (
          <g key={n}>
            <circle cx={x} cy={y} r="9" fill={extremo ? 'var(--brand)' : enMejor.has(n) ? 'var(--cocoa)' : 'var(--surface)'} stroke="var(--cocoa)" strokeWidth="1.5" />
            <text
              x={x + (derecha ? 14 : -14)}
              y={y + 4}
              textAnchor={derecha ? 'start' : 'end'}
              fontSize="11"
              fill="var(--ink)"
              fontWeight={extremo ? 700 : 400}
            >
              {n}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function PlanPerfil({ limite }) {
  const [studentId] = useActiveStudent()
  const { data: vacantes } = useFetch(getVacancies)
  const [vacanteId, setVacanteId] = useState('')
  const vid = vacanteId || vacantes?.[0]?.id || vacantes?.[0]?._id || ''
  const idDe = (v) => v.id ?? v._id
  const { data: plan, error, loading } = useFetch(
    () => getPlanAprendizaje(studentId, vid, limite),
    [studentId, vid, limite],
    Boolean(studentId && vid),
  )

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-2xl font-medium">Para mi perfil</h2>
        <p className="mt-1 font-body text-sm text-muted">
          Parte de las habilidades del perfil activo y busca cómo llegar a las que le faltan para la vacante elegida.
        </p>
      </div>
      {!studentId ? (
        <p className="font-body text-sm text-muted">
          Crea tu perfil de estudiante para ver tu ruta personalizada.
        </p>
      ) : (
        <>
          <select className={inputCls} value={vid} onChange={(e) => setVacanteId(e.target.value)}>
            {(vacantes ?? []).map((v) => (
              <option key={idDe(v)} value={idDe(v)}>
                {v.titulo || v.sector} · {v.nombre_empresa}
              </option>
            ))}
          </select>
          {loading && <p className="font-body text-sm text-muted">Buscando rutas…</p>}
          {error && <p className="font-body text-sm text-brand">{error}</p>}
          {plan && (
            <div className="flex flex-col gap-3">
              {plan.faltantes_en_grafo.length === 0 && plan.sin_ruta.length === 0 && (
                <p className="font-body text-sm text-muted">¡No te falta ninguna habilidad para esta vacante!</p>
              )}
              {plan.faltantes_en_grafo.map((p) => (
                <div key={p.skill_faltante} className="stat flex flex-col gap-2 p-4">
                  <p className="font-body text-sm font-semibold text-ink">
                    Te falta «{p.skill_faltante}» · {p.pasos} {p.pasos === 1 ? 'paso' : 'pasos'}
                  </p>
                  <Flecha ruta={p.ruta_recomendada} />
                  <p className="font-body text-xs text-muted">
                    {p.rutas_alternativas} rutas posibles dentro del límite · {p.nodos_explorados} nodos explorados
                  </p>
                </div>
              ))}
              {plan.sin_ruta.length > 0 && (
                <p className="font-body text-xs text-muted">
                  Sin ruta (no están en el grafo o quedan más lejos que el límite): {plan.sin_ruta.join(', ')}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function RutasAprendizaje() {
  const { data: grafo } = useFetch(getGrafoSkills)
  const skills = useMemo(() => (grafo ? Object.keys(grafo) : []), [grafo])
  const [desde, setDesde] = useState('excel')
  const [hasta, setHasta] = useState('machine learning')
  const [algoritmo, setAlgoritmo] = useState('dfs_todas')
  const [limite, setLimite] = useState(4)
  const [res, setRes] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false
    buscarRutas({ desde, hasta, algoritmo, limite })
      .then((r) => !cancelado && (setRes(r), setError('')))
      .catch((e) => !cancelado && setError(e.message))
    return () => {
      cancelado = true
    }
  }, [desde, hasta, algoritmo, limite])

  const intercambiar = () => {
    setDesde(hasta)
    setHasta(desde)
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle
        title="Rutas de aprendizaje"
        subtitle="Cómo llegar de una habilidad que ya tienes a una que te piden, recorriendo el grafo de habilidades con DFS o BFS."
      />

      <div className="card grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_1fr]">
        <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-muted">
          Habilidad que tengo
          <select className={inputCls} value={desde} onChange={(e) => setDesde(e.target.value)}>
            {skills.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={intercambiar}
          title="Intercambiar"
          className="mt-6 hidden h-10 w-10 items-center justify-center rounded-lg border border-line text-muted hover:text-brand lg:flex"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
        <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-muted">
          Habilidad que quiero
          <select className={inputCls} value={hasta} onChange={(e) => setHasta(e.target.value)}>
            {skills.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-muted">
          Algoritmo
          <select className={inputCls} value={algoritmo} onChange={(e) => setAlgoritmo(e.target.value)}>
            {ALGORITMOS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 font-body text-xs font-semibold text-muted">
          Límite de profundidad: {limite}
          <input type="range" min="1" max="8" value={limite} onChange={(e) => setLimite(Number(e.target.value))} className="mt-2 accent-[var(--brand)]" />
        </label>
      </div>

      {error && <p className="font-body text-sm text-brand">{error}</p>}

      {res && grafo && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="card p-4">
            <GrafoSVG grafo={grafo} rutas={res.rutas} inicio={desde} objetivo={hasta} />
            <p className="flex flex-wrap gap-4 px-2 font-body text-xs text-muted">
              <span><b className="text-brand">━</b> ruta más corta</span>
              <span className="flex items-center gap-1.5"><i className="inline-block h-1 w-6 rounded-full bg-caramel" /> otras rutas</span>
              <span>● extremos de la búsqueda</span>
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="card flex flex-col gap-3 p-6">
              <h2 className="flex items-center gap-2 text-xl font-medium">
                <RouteIcon className="h-5 w-5 text-brand" />
                {res.rutas.length === 0 ? 'Sin ruta' : `Ruta${res.rutas.length > 1 ? 's' : ''} encontrada${res.rutas.length > 1 ? 's' : ''} (${res.rutas.length})`}
              </h2>
              {res.rutas.length === 0 && (
                <p className="font-body text-sm text-muted">No hay ruta dentro del límite. Prueba subirlo.</p>
              )}
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                {res.rutas.map((r, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="font-body text-xs font-semibold text-muted">Ruta {i + 1} · {r.length - 1} pasos</span>
                    <Flecha ruta={r} />
                  </div>
                ))}
              </div>
            </div>

            <div className="card flex flex-col gap-3 p-6">
              <h2 className="text-xl font-medium">Cómo lo exploró</h2>
              <p className="font-body text-xs text-muted">
                Orden de exploración ({res.orden_exploracion.length} visitas, {res.nodos_explorados.length} nodos distintos). No es lo mismo que la ruta encontrada.
              </p>
              <ol className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {res.orden_exploracion.map((n, i) => (
                  <li key={i} className="chip px-2 py-1 font-body text-xs text-ink">
                    <span className="text-muted">{i + 1}.</span> {n}
                  </li>
                ))}
              </ol>
              <dl className="grid grid-cols-2 gap-3 font-body text-xs">
                <div className="stat p-3"><dt className="text-muted">Límite de profundidad</dt><dd className="mt-1 text-base font-semibold text-ink">{res.limite_profundidad ?? 'sin límite'}</dd></div>
                <div className="stat p-3"><dt className="text-muted">Ramas cortadas por el límite</dt><dd className="mt-1 text-base font-semibold text-ink">{res.podados_por_limite}</dd></div>
                <div className="stat col-span-2 p-3">
                  <dt className="text-muted">Contra ciclos infinitos</dt>
                  <dd className="mt-1 text-ink">{res.mecanismo_ciclos}. Ciclos evitados: <b>{res.ciclos_evitados.length}</b>
                    {res.ciclos_evitados[0] && <> (ej.: {res.ciclos_evitados[0].join(' → ')})</>}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      <PlanPerfil limite={limite} />
      <p className="font-body text-xs text-muted">
        ¿Buscas vacantes? <Link to="/vacantes" className="text-brand underline">Ver vacantes</Link>
      </p>
    </section>
  )
}
