import { ArrowRight, CheckCircle2, Clock, MapPin, TriangleAlert } from 'lucide-react'
import useFetch from '../../hooks/useFetch'
import { getTrasladoUsuario } from '../../services/api'
import MapaRuta from './MapaRuta'

const selectCls =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 font-body text-base text-ink focus:border-cocoa focus:outline-none'

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

// La pantalla pensada para quien no sabe de algoritmos: dónde vives, dónde está la vacante,
// cuánto tardas, por dónde y si cabe en el límite.
export default function VistaUsuario({ zonas, desde, hasta, setDesde, setHasta }) {
  const { data: r, error, loading } = useFetch(() => getTrasladoUsuario({ desde, hasta }), [desde, hasta], zonas.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="card grid gap-4 p-6 sm:grid-cols-2">
        <label className="flex flex-col gap-2 font-body text-sm font-semibold text-ink">
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand" /> Dónde vives</span>
          <select className={selectCls} value={desde} onChange={(e) => setDesde(e.target.value)}>
            {zonas.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 font-body text-sm font-semibold text-ink">
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand" /> Dónde está la vacante</span>
          <select className={selectCls} value={hasta} onChange={(e) => setHasta(e.target.value)}>
            {zonas.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="font-body text-sm text-brand">{error}</p>}
      {loading && !r && <div className="card h-48 animate-pulse" aria-busy="true" />}

      {r && (
        <>
          <div className="card flex flex-col gap-5 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-brand" />
                <p className="font-heading text-4xl font-medium text-ink">
                  {r.misma_zona ? 'Misma zona' : r.encontrado ? `Unos ${r.minutos} min` : 'Sin ruta'}
                </p>
              </div>
              {r.encontrado && (
                <span
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-body text-sm font-semibold ${
                    r.compatible ? 'bg-teal/25 text-ink' : 'bg-brand-soft text-ink'
                  }`}
                >
                  {r.compatible ? <CheckCircle2 className="h-4 w-4 text-teal" /> : <TriangleAlert className="h-4 w-4 text-brand" />}
                  {r.compatible ? `Dentro de tu límite de ${r.limite_minutos} min` : `Más de ${r.limite_minutos} min`}
                </span>
              )}
            </div>

            <p className="max-w-3xl font-body text-base leading-relaxed text-ink">{r.frase}</p>

            {r.pasos.length > 0 && (
              <div>
                <h2 className="mb-3 font-body text-sm font-semibold uppercase tracking-wide text-muted">Tu recorrido</h2>
                <ol className="flex flex-col gap-2">
                  {r.pasos.map((p, i) => (
                    <li key={`${p.de}-${p.a}`} className="stat flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 font-body text-base">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-on-brand">
                        {i + 1}
                      </span>
                      <span className="font-medium">{p.de}</span>
                      <ArrowRight className="h-4 w-4 text-muted" />
                      <span className="font-medium">{p.a}</span>
                      <span className="ml-auto font-semibold">{p.minutos} min</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {r.alternativas.length > 0 && (
              <div>
                <h2 className="mb-3 font-body text-sm font-semibold uppercase tracking-wide text-muted">Otras opciones</h2>
                <ul className="flex flex-col gap-3">
                  {r.alternativas.map((a) => (
                    <li key={a.camino.join('>')} className="flex flex-wrap items-center gap-3 font-body text-base text-ink">
                      <span className="stat px-3 py-1 font-semibold">{a.minutos} min</span>
                      <Ruta ruta={a.camino} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {r.encontrado && !r.misma_zona && (
            <div className="card p-4 sm:p-6">
              <MapaRuta ruta={r.ruta} alternativa={r.alternativas[0]?.camino} tramos={r.tramos} origen={r.origen} destino={r.destino} />
              <p className="px-2 pt-3 font-body text-sm text-muted">Tiempos aproximados, de ejemplo.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
