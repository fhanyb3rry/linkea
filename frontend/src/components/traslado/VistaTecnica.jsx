import { useState } from 'react'
import { ArrowRight, BadgeCheck, TriangleAlert } from 'lucide-react'
import useFetch from '../../hooks/useFetch'
import {
  buscarTraslado,
  compararTraslado,
  getTrasladoDistancia,
  getTrasladoHeuristica,
  getTrasladoResumen,
  todasLasRutasTraslado,
} from '../../services/api'
import GrafoTecnico from './GrafoTecnico'

const ALGORITMOS = [
  { id: 'astar', label: 'A* · el más inteligente (tiempo real + estimación)' },
  { id: 'greedy', label: 'Greedy · el impaciente (solo la estimación)' },
  { id: 'ucs', label: 'UCS · el preciso (solo el tiempo real)' },
  { id: 'bfs', label: 'BFS · revisa por niveles' },
  { id: 'dfs', label: 'DFS · va a lo profundo primero' },
]
const CON_HEURISTICA = ['astar', 'greedy']
const SIN_LIMITE = 9

const selectCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-body text-sm text-ink focus:border-cocoa focus:outline-none'

// Encabezado de cada bloque: número + título, para que se lea como una secuencia.
function Seccion({ n, titulo, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-3 font-heading text-2xl font-medium text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-body text-sm font-bold text-on-brand">{n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Campo({ etiqueta, children }) {
  return (
    <label className="flex flex-col gap-1.5 font-body text-sm font-semibold text-ink">
      {etiqueta}
      {children}
    </label>
  )
}

function Ruta({ ruta }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {ruta.map((z, i) => (
        <span key={`${z}-${i}`} className="flex items-center gap-2">
          <span className="chip px-2.5 py-1 font-body text-sm font-medium">{z}</span>
          {i < ruta.length - 1 && <ArrowRight className="h-4 w-4 text-muted" />}
        </span>
      ))}
    </span>
  )
}

function Dato({ etiqueta, valor, destacado }) {
  return (
    <div className={`stat px-4 py-3 ${destacado ? 'ring-2 ring-brand/40' : ''}`}>
      <dt className="font-body text-sm text-muted">{etiqueta}</dt>
      <dd className="mt-1 font-heading text-2xl font-medium text-ink">{valor}</dd>
    </div>
  )
}

export default function VistaTecnica({ zonas, mapa, desde, hasta, setDesde, setHasta }) {
  const [algoritmo, setAlgoritmo] = useState('astar')
  const [tipoH, setTipoH] = useState('euclidiana')
  const [limite, setLimite] = useState(SIN_LIMITE)
  const lim = limite >= SIN_LIMITE ? null : limite

  const { data: h } = useFetch(() => getTrasladoHeuristica(hasta, tipoH), [hasta, tipoH])
  const { data: res, error } = useFetch(
    () => buscarTraslado({ desde, hasta, algoritmo, limite: lim, heuristica: tipoH }),
    [desde, hasta, algoritmo, lim, tipoH],
  )
  const { data: comparacion } = useFetch(() => compararTraslado({ desde, hasta, limite: lim, heuristica: tipoH }), [desde, hasta, lim, tipoH])
  const { data: todas } = useFetch(() => todasLasRutasTraslado({ desde, hasta, limite: lim ?? 8 }), [desde, hasta, lim])
  const { data: resumen } = useFetch(() => getTrasladoResumen(tipoH), [tipoH])
  const { data: dist } = useFetch(() => getTrasladoDistancia({ desde, hasta, tipo: tipoH }), [desde, hasta, tipoH])
  const verif = mapa.heuristicas?.[tipoH]

  const minimo = comparacion ? Math.min(...comparacion.filter((r) => r.encontrado).map((r) => r.costo_real)) : null
  const usaH = CON_HEURISTICA.includes(algoritmo)

  return (
    <div className="flex flex-col gap-10">
      {/* 1. CONFIGURACIÓN */}
      <Seccion n="1" titulo="Qué buscar y cómo">
        <div className="card grid gap-6 p-6 lg:grid-cols-[1fr_1.5fr]">
          <div className="flex flex-col gap-4">
            <p className="font-body text-xs font-bold uppercase tracking-wider text-muted">Trayecto</p>
            <Campo etiqueta="Zona de origen (donde vives)">
              <select className={selectCls} value={desde} onChange={(e) => setDesde(e.target.value)}>
                {zonas.map((z) => <option key={z}>{z}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Zona de destino (la vacante)">
              <select className={selectCls} value={hasta} onChange={(e) => setHasta(e.target.value)}>
                {zonas.map((z) => <option key={z}>{z}</option>)}
              </select>
            </Campo>
          </div>
          <div className="flex flex-col gap-4 lg:border-l lg:border-line lg:pl-6">
            <p className="font-body text-xs font-bold uppercase tracking-wider text-muted">Cómo buscarlo</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Método de búsqueda">
                <select className={selectCls} value={algoritmo} onChange={(e) => setAlgoritmo(e.target.value)}>
                  {ALGORITMOS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Cómo estimar la distancia">
                <select className={selectCls} value={tipoH} onChange={(e) => setTipoH(e.target.value)}>
                  <option value="euclidiana">En línea recta (euclidiana)</option>
                  <option value="manhattan">Como por calles en cuadrícula (manhattan)</option>
                </select>
              </Campo>
            </div>
            <Campo etiqueta={`Máximo de tramos: ${lim ?? 'sin límite'}`}>
              <input
                type="range" min="1" max={SIN_LIMITE} value={limite}
                onChange={(e) => setLimite(Number(e.target.value))}
                className="mt-1 accent-[var(--brand)]"
              />
              <span className="flex justify-between font-body text-xs font-normal text-muted"><span>1 tramo</span><span>sin límite</span></span>
            </Campo>
          </div>
        </div>
        {error && <p className="font-body text-sm text-brand">{error}</p>}
      </Seccion>

      {/* 2. GRAFO Y RESULTADO */}
      <Seccion n="2" titulo="Qué encontró">
        <div className="flex flex-col gap-6">
          <div className="card overflow-x-auto p-5">
            <GrafoTecnico mapa={mapa} h={h} resultado={res} todas={todas} desde={desde} hasta={hasta} mostrarH={usaH} />
          </div>

          {res && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card flex flex-col gap-5 p-6">
                <div>
                  <p className="font-body text-sm text-muted">{res.algoritmo}</p>
                  <p className="font-heading text-4xl font-medium text-ink">{res.encontrado ? `${res.costo_real} min` : 'Sin ruta'}</p>
                </div>
                {res.encontrado ? (
                  <Ruta ruta={res.camino} />
                ) : (
                  <p className="font-body text-sm text-ink">No hay ruta dentro del máximo de tramos. Sube el límite para encontrarla.</p>
                )}
                <dl className="grid grid-cols-2 gap-3">
                  <Dato etiqueta="Tiempo real del recorrido" valor={res.encontrado ? `${res.costo_real} min` : '—'} />
                  <Dato etiqueta="Estimado antes de buscar" valor={`${res.costo_estimado} min`} destacado={usaH} />
                  <Dato etiqueta="Tramos" valor={res.aristas} />
                  <Dato etiqueta="Zonas revisadas" valor={res.cantidad_expandidos} />
                </dl>
              </div>

              <div className="card flex flex-col gap-5 p-6">
                <div>
                  <h3 className="mb-3 font-body text-sm font-semibold text-ink">Orden en que revisó las zonas</h3>
                  <ol className="flex flex-wrap gap-2">
                    {res.expandidos.map((z, i) => (
                      <li key={`${z}-${i}`} className="chip flex items-center gap-2 px-2.5 py-1 font-body text-sm">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs font-bold text-surface">{i + 1}</span>
                        {z}
                      </li>
                    ))}
                  </ol>
                </div>
                <details className="group rounded-lg border border-line px-4 py-3 font-body text-sm text-ink">
                  <summary className="cursor-pointer font-semibold">Cómo evita dar vueltas</summary>
                  <p className="mt-2 leading-relaxed">
                    Nunca vuelve a una zona que ya forma parte de la ruta que está armando, así no puede quedarse
                    girando en círculo. Vueltas evitadas: <b>{res.ciclos_evitados.length}</b>
                    {res.ciclos_evitados[0] && <> (por ejemplo, {res.ciclos_evitados[0].join(' → ')})</>}.
                  </p>
                </details>
                <details className="group rounded-lg border border-line px-4 py-3 font-body text-sm text-ink">
                  <summary className="cursor-pointer font-semibold">Paso a paso de la búsqueda</summary>
                  <ol className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto leading-snug">
                    {res.registro.map((linea, i) => (
                      <li key={i} className={linea.startsWith('  ') ? 'pl-4 text-muted' : 'font-medium'}>{linea.trim()}</li>
                    ))}
                  </ol>
                </details>
              </div>
            </div>
          )}
        </div>
      </Seccion>

      {/* 3. CÓMO SE CALCULA h */}
      {dist && (
        <Seccion n="3" titulo={`De dónde sale la estimación (distancia ${dist.tipo})`}>
          <div className="card flex flex-col gap-5 p-6">
            {verif && (
              <>
                <div
                  className={`flex w-fit items-center gap-2 rounded-full px-4 py-1.5 font-body text-sm font-semibold text-ink ${
                    verif.admisible ? 'bg-teal/25' : 'bg-brand-soft'
                  }`}
                >
                  {verif.admisible ? <BadgeCheck className="h-4 w-4 text-teal" /> : <TriangleAlert className="h-4 w-4 text-brand" />}
                  Estimación {verif.admisible ? 'confiable' : 'optimista de más'}
                  {verif.consistente ? ' y coherente' : ''}
                </div>
                <p className="font-body text-xs text-muted">
                  {verif.admisible
                    ? 'Nunca exagera: siempre promete un tiempo menor o igual que el real, por eso la búsqueda sigue siendo exacta.'
                    : 'Puede prometer menos tiempo del real en algunos casos: la búsqueda podría no encontrar la ruta más rápida.'}
                </p>
              </>
            )}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 font-body text-sm text-muted">
                  Origen A = {dist.origen} · Destino B = {dist.destino}
                </p>
                <table className="w-full border-collapse text-center font-body text-sm text-ink">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="py-2 font-semibold">Eje</th><th className="font-semibold">A</th><th className="font-semibold">B</th>
                      <th className="font-semibold">A − B</th><th className="font-semibold">{dist.extra_titulo}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dist.tabla.map((f) => (
                      <tr key={f.eje} className="border-b border-line/60">
                        <td className="py-2.5 font-semibold">{f.eje}</td><td>{f.a}</td><td>{f.b}</td><td>{f.dif}</td><td>{f.extra}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-center font-body text-sm text-muted">Suma = {dist.suma}</p>
              </div>
              <div className="flex flex-col gap-3">
                <p className="font-body text-base font-semibold text-brand">{dist.formula}</p>
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-ink">{dist.pasos}</pre>
                <p className="stat px-4 py-3 font-body text-sm font-semibold">{dist.paso_minutos}</p>
              </div>
            </div>
          </div>
        </Seccion>
      )}

      {/* 4. COMPARACIÓN */}
      {comparacion && (
        <Seccion n="4" titulo="Los 5 métodos buscando lo mismo">
          <div className="card overflow-x-auto p-2 sm:p-4">
            <table className="w-full min-w-[640px] border-collapse font-body text-sm text-ink">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="px-3 py-3 font-semibold">Método</th>
                  <th className="px-3 font-semibold">Ruta encontrada</th>
                  <th className="px-3 font-semibold">Minutos</th>
                  <th className="px-3 font-semibold">Zonas revisadas</th>
                </tr>
              </thead>
              <tbody>
                {comparacion.map((r) => {
                  const esMinimo = r.encontrado && r.costo_real === minimo
                  const elegido = res && r.algoritmo === res.algoritmo
                  return (
                    <tr key={r.algoritmo} className={`border-b border-line/60 align-middle ${elegido ? 'bg-brand-soft' : ''}`}>
                      <td className="px-3 py-3 font-semibold">{r.algoritmo}</td>
                      <td className="px-3 py-3">{r.encontrado ? <Ruta ruta={r.camino} /> : <span className="text-muted">Sin ruta</span>}</td>
                      <td className="px-3 py-3 font-semibold">
                        {r.encontrado ? r.costo_real : '—'}
                        {esMinimo && <span className="ml-2 rounded-full bg-teal/25 px-2 py-0.5 text-xs font-semibold">mínimo</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-24 overflow-hidden rounded-full bg-line">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${(r.cantidad_expandidos / zonas.length) * 100}%` }} />
                          </div>
                          <span className="font-semibold">{r.cantidad_expandidos}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Seccion>
      )}

      {/* 5. RUTAS Y PRUEBA GENERAL */}
      <div className="grid gap-10 lg:grid-cols-2">
        {todas && (
          <Seccion n="5" titulo={`Todas las rutas (${todas.rutas.length})`}>
            <div className="card flex flex-col gap-4 p-6">
              <p className="font-body text-sm text-muted">
                Vueltas evitadas: <b className="text-ink">{todas.ciclos_evitados.length}</b> · caminos descartados por pasar del límite:{' '}
                <b className="text-ink">{todas.podados_por_limite}</b>
              </p>
              <ol className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
                {todas.rutas.map((r, i) => (
                  <li key={i} className="flex flex-col gap-1.5">
                    <span className="font-body text-sm font-semibold text-ink">
                      Ruta {i + 1} · {r.minutos} min · {r.aristas} tramos
                    </span>
                    <Ruta ruta={r.camino} />
                  </li>
                ))}
                {todas.rutas.length === 0 && <p className="font-body text-sm text-ink">Ninguna ruta cabe en el límite.</p>}
              </ol>
            </div>
          </Seccion>
        )}

        {resumen && (
          <Seccion n="6" titulo="¿Ayuda la estimación?">
            <div className="card flex flex-col gap-4 p-6">
              <p className="font-body text-sm text-muted">Los 5 métodos probados en las {resumen.pares} combinaciones de zonas.</p>
              <table className="w-full border-collapse font-body text-sm text-ink">
                <thead>
                  <tr className="border-b border-line text-left text-muted">
                    <th className="py-2 font-semibold">Método</th>
                    <th className="font-semibold">Veces que no dio la ruta más rápida</th>
                    <th className="font-semibold">Zonas revisadas (promedio)</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.algoritmos.map((a) => (
                    <tr key={a.algoritmo} className="border-b border-line/60">
                      <td className="py-3 font-semibold">{a.algoritmo}</td>
                      <td className={a.no_optimas === 0 ? 'font-semibold' : ''}>{a.no_optimas}</td>
                      <td>{a.expandidos_promedio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>
        )}
      </div>
    </div>
  )
}
