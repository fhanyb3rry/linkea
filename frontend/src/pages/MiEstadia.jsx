import { Link } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'
import ListState from '../components/layout/ListState'
import PageTitle from '../components/layout/PageTitle'
import SeguimientoVista from '../components/seguimiento/SeguimientoVista'
import useFetch from '../hooks/useFetch'
import { getSeguimientos } from '../services/api'

// El estudiante ve directamente su estadía (la más reciente si tuviera más de una).
export default function MiEstadia() {
  const { data, error, loading } = useFetch(() => getSeguimientos(), [])

  if (data?.length) return <SeguimientoVista id={data[0].id} title="Mi estadía" />

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle title="Mi estadía" subtitle="Aquí darás seguimiento a tu estadía: horas, bitácoras, reportes y documentos." />
      <ListState loading={loading} error={error} />
      {data && (
        <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cocoa-soft text-cocoa">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <p className="font-heading text-xl text-ink">Aún no tienes una estadía asignada</p>
          <p className="max-w-sm font-body text-sm text-muted">
            Cuando una empresa te acepte y confirme tu estadía, aparecerá aquí su seguimiento.
          </p>
          <Link
            to="/postulaciones"
            className="mt-1 rounded-lg bg-brand px-5 py-2.5 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
          >
            Ver mis postulaciones
          </Link>
        </div>
      )}
    </section>
  )
}
