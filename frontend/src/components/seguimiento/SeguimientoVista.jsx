import { useState } from 'react'
import { useAuth } from '../../context/auth'
import useFetch from '../../hooks/useFetch'
import { ESTADO_SEGUIMIENTO } from '../../lib/seguimiento'
import { getSeguimiento } from '../../services/api'
import ListState from '../layout/ListState'
import PageTitle from '../layout/PageTitle'
import Bitacoras from './Bitacoras'
import Documentos from './Documentos'
import Incidencias from './Incidencias'
import Reportes from './Reportes'
import Resumen from './Resumen'
import { Pill } from './ui'

const PESTANAS = [
  { id: 'resumen', label: 'Resumen', Componente: Resumen },
  { id: 'bitacoras', label: 'Bitácoras', Componente: Bitacoras },
  { id: 'documentos', label: 'Documentos', Componente: Documentos },
  { id: 'reportes', label: 'Reportes', Componente: Reportes },
  { id: 'incidencias', label: 'Incidencias', Componente: Incidencias },
]

// Seguimiento completo de una estadía. Lo usan todos los roles; cada sección muestra solo las
// acciones que le tocan a quien la ve.
export default function SeguimientoVista({ id, title, back }) {
  const { usuario } = useAuth()
  const { data, error, loading } = useFetch(() => getSeguimiento(id), [id])
  // Cada acción devuelve el seguimiento ya actualizado: se guarda aquí sin volver a consultar.
  const [actualizado, setActualizado] = useState(null)
  const [pestana, setPestana] = useState('resumen')
  const seg = actualizado?.id === id ? actualizado : data
  const { Componente } = PESTANAS.find((p) => p.id === pestana)

  const contador = seg && {
    bitacoras: seg.bitacoras.filter((b) => b.estado === 'pendiente').length,
    documentos: seg.documentos.length - seg.documentos_completos,
    incidencias: seg.incidencias_abiertas,
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle
        title={title ?? seg?.estudiante_nombre ?? 'Seguimiento'}
        subtitle={seg && `${seg.vacante_titulo || 'Estadía'} · ${seg.organizacion_nombre}`}
        back={back}
      >
        {seg && <Pill estado={seg.estado} mapa={ESTADO_SEGUIMIENTO} />}
      </PageTitle>

      <ListState loading={loading} error={error} />

      {seg && (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones del seguimiento">
            {PESTANAS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={pestana === p.id}
                onClick={() => setPestana(p.id)}
                className={`rounded-full border px-4 py-1.5 font-body text-xs font-medium transition-colors ${
                  pestana === p.id ? 'border-cocoa bg-cocoa text-on-cocoa' : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                {p.label}
                {contador[p.id] > 0 && <span className="ml-1.5 opacity-70">{contador[p.id]}</span>}
              </button>
            ))}
          </div>
          <Componente seg={seg} usuario={usuario} onChange={setActualizado} />
        </>
      )}
    </section>
  )
}
