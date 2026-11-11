import { useSearchParams } from 'react-router-dom'
import PageTitle from '../components/layout/PageTitle'
import VistaSimulador from '../components/ml/VistaSimulador'
import VistaTecnicaML from '../components/ml/VistaTecnicaML'
import useFetch from '../hooks/useFetch'
import { getEstadoML } from '../services/api'

const VISTAS = [
  ['simulador', 'Evaluador y simulador'],
  ['tecnico', 'Detalle técnico (60 / 20 / 20)'],
]

export default function PrediccionML() {
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') === 'tecnico' ? 'tecnico' : 'simulador'
  const { data: estado, error, loading, reload } = useFetch(getEstadoML)

  function cambiarVista(nueva) {
    const siguientes = new URLSearchParams(params)
    if (nueva === 'simulador') siguientes.delete('vista')
    else siguientes.set('vista', nueva)
    setParams(siguientes)
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle
        title="Predicción con Machine Learning"
        subtitle={
          vista === 'simulador'
            ? 'Compara el sistema de reglas fijas contra el Árbol de Decisión entrenado en Linkea.'
            : 'Entrenamiento (60%), validación y selección de hiperparámetros (20%), prueba final (20%) y gráficas.'
        }
      />

      <div role="tablist" aria-label="Vista de Machine Learning" className="flex w-fit flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
        {VISTAS.map(([id, texto]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={vista === id}
            onClick={() => cambiarVista(id)}
            className={`rounded-full px-5 py-2 font-body text-sm font-semibold transition-colors ${
              vista === id ? 'bg-brand text-on-brand' : 'text-ink hover:bg-brand-soft'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-brand-soft p-4 font-body text-sm text-ink">
          No se pudo cargar el modelo: {error}
        </p>
      )}

      {vista === 'simulador' ? (
        <VistaSimulador variables={estado?.variables} />
      ) : (
        <VistaTecnicaML estado={estado} loading={loading} onReload={reload} />
      )}
    </section>
  )
}
