import { useSearchParams } from 'react-router-dom'
import CatalogoDocumentos from '../components/coordinacion/CatalogoDocumentos'
import IncidenciasLista from '../components/coordinacion/IncidenciasLista'
import Indicadores from '../components/coordinacion/Indicadores'
import Personal from '../components/coordinacion/Personal'
import PostulacionesTabla from '../components/coordinacion/PostulacionesTabla'
import PageTitle from '../components/layout/PageTitle'

const PESTANAS = [
  { id: 'panel', label: 'Panel', Componente: Indicadores },
  { id: 'postulaciones', label: 'Postulaciones', Componente: PostulacionesTabla },
  { id: 'incidencias', label: 'Incidencias', Componente: IncidenciasLista },
  { id: 'documentos', label: 'Documentos', Componente: CatalogoDocumentos },
  { id: 'personal', label: 'Personal', Componente: Personal },
]

// Panel institucional de coordinación de estadías. La pestaña va en la URL (?vista=…) para poder
// compartir o recargar sin perderla.
export default function Coordinacion() {
  const [params, setParams] = useSearchParams()
  const actual = PESTANAS.find((p) => p.id === params.get('vista')) ?? PESTANAS[0]
  const { Componente } = actual

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle title="Coordinación de estadías" subtitle="Consulta institucional de estudiantes, organizaciones, postulaciones y estadías." />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones de coordinación">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={actual.id === p.id}
            onClick={() => setParams(p.id === 'panel' ? {} : { vista: p.id })}
            className={`rounded-full border px-4 py-1.5 font-body text-xs font-medium transition-colors ${
              actual.id === p.id ? 'border-cocoa bg-cocoa text-on-cocoa' : 'border-line bg-surface text-muted hover:text-ink'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Componente />
    </section>
  )
}
