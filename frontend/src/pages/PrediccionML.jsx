import { useSearchParams } from 'react-router-dom'
import PageTitle from '../components/layout/PageTitle'
import VistaPractica04 from '../components/ml/VistaPractica04'
import VistaPractica05 from '../components/ml/VistaPractica05'
import VistaPractica06 from '../components/ml/VistaPractica06'
import VistaSimulador from '../components/ml/VistaSimulador'
import VistaTecnicaML from '../components/ml/VistaTecnicaML'
import { useAuth } from '../context/auth'
import useFetch from '../hooks/useFetch'
import { getEstadoML } from '../services/api'

// Las vistas técnicas de calibración, comparación y optimización quedan reservadas exclusivamente
// para coordinación institucional; estudiantes, empresas y asesores solo ven lenguaje claro y útil.
const VISTAS_COORDINADOR = [
  ['simulador', 'Simulador de posibilidades'],
  ['p04', 'Calibración y ajuste (60/20/20)'],
  ['p05', 'Comparación de motores'],
  ['p06', 'Optimización de motores'],
  ['tecnico', 'Cortes manuales vs aprendizaje'],
]

const SUBTITULOS = {
  simulador: 'Consulta qué tan probable es ser aceptado según postulaciones anteriores de Linkea y simula cómo mejorar tu perfil.',
  p04: 'Auditoría institucional de entrenamiento (60%), validación (20%), prueba (20%) y control de sobreajuste.',
  p05: 'Comparación automática entre motores de clasificación y experimentos de sensibilidad.',
  p06: 'Búsqueda exhaustiva (GridSearchCV) y aleatoria (RandomizedSearchCV) de la mejor configuración.',
  tecnico: 'Comparativa entre criterios manuales rígidos y el modelo entrenado con casos históricos.',
}

const IDS_VALIDOS = new Set(VISTAS_COORDINADOR.map(([id]) => id))

export default function PrediccionML() {
  const { usuario } = useAuth()
  const esCoordinador = usuario?.rol === 'coordinador'

  const [params, setParams] = useSearchParams()
  const paramVista = params.get('vista')
  const vista = esCoordinador && IDS_VALIDOS.has(paramVista) ? paramVista : 'simulador'

  const { data: estado, loading, reload } = useFetch(
    () => (esCoordinador && vista === 'tecnico' ? getEstadoML() : Promise.resolve(null)),
    [esCoordinador, vista],
  )

  function cambiarVista(nueva) {
    const siguientes = new URLSearchParams(params)
    if (nueva === 'simulador') siguientes.delete('vista')
    else siguientes.set('vista', nueva)
    setParams(siguientes)
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle
        title={esCoordinador && vista !== 'simulador' ? 'Calibración del pronóstico' : 'Pronóstico y simulador de postulación'}
        subtitle={SUBTITULOS[vista]}
      />

      {esCoordinador && (
        <div
          role="tablist"
          aria-label="Secciones de pronóstico y calibración"
          className="flex w-fit flex-wrap gap-1 rounded-2xl border border-line bg-surface p-1"
        >
          {VISTAS_COORDINADOR.map(([id, texto]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={vista === id}
              onClick={() => cambiarVista(id)}
              className={`rounded-xl px-4 py-2 font-body text-sm font-semibold transition-colors ${
                vista === id ? 'bg-brand text-on-brand' : 'text-ink hover:bg-brand-soft'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      )}

      {vista === 'simulador' && <VistaSimulador />}
      {esCoordinador && vista === 'p04' && <VistaPractica04 />}
      {esCoordinador && vista === 'p05' && <VistaPractica05 />}
      {esCoordinador && vista === 'p06' && <VistaPractica06 />}
      {esCoordinador && vista === 'tecnico' && <VistaTecnicaML estado={estado} loading={loading} onReload={reload} />}
    </section>
  )
}
