import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageTitle from '../components/layout/PageTitle'
import VistaTecnica from '../components/traslado/VistaTecnica'
import VistaUsuario from '../components/traslado/VistaUsuario'
import useFetch from '../hooks/useFetch'
import { getTrasladoMapa } from '../services/api'

// Dos vistas del mismo cálculo:
//   "Mi traslado"      -> lo que necesita saber el usuario (resumen, recorrido y un mapa limpio).
//   "Detalle técnico"  -> cómo lo calcula: algoritmos, heurística, comparativos.
const VISTAS = [
  ['usuario', 'Mi traslado'],
  ['tecnico', 'Detalle técnico'],
]

export default function Traslado() {
  const [params, setParams] = useSearchParams()
  const { data: mapa } = useFetch(getTrasladoMapa)
  const [desde, setDesdeState] = useState(params.get('desde') || 'Zinacantepec')
  const [hasta, setHastaState] = useState(params.get('hasta') || 'Lerma')
  const vista = params.get('vista') === 'tecnico' ? 'tecnico' : 'usuario'

  const zonas = useMemo(() => (mapa ? mapa.zonas.map((z) => z.nombre) : []), [mapa])

  const setDesde = (v) => {
    setDesdeState(v)
    setParams({ desde: v, hasta, vista })
  }
  const setHasta = (v) => {
    setHastaState(v)
    setParams({ desde, hasta: v, vista })
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle
        title="Traslado a la vacante"
        subtitle={vista === 'usuario' ? 'Elige dónde vives y dónde está la vacante, y te decimos cuánto tardas en llegar.' : undefined}
      />

      <div role="tablist" aria-label="Vista" className="flex w-fit gap-1 rounded-full border border-line bg-surface p-1">
        {VISTAS.map(([id, texto]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={vista === id}
            onClick={() => setParams({ desde, hasta, vista: id })}
            className={`rounded-full px-5 py-2 font-body text-sm font-semibold transition-colors ${
              vista === id ? 'bg-brand text-on-brand' : 'text-ink hover:bg-brand-soft'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {vista === 'usuario' ? (
        <VistaUsuario zonas={zonas} desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />
      ) : (
        mapa && <VistaTecnica zonas={zonas} mapa={mapa} desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />
      )}
    </section>
  )
}
