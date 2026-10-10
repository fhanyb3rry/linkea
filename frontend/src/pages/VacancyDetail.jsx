import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Bookmark, Clock, GraduationCap, MapPin, Wallet } from 'lucide-react'
import EligibilityPanel from '../components/cards/EligibilityPanel'
import ListState from '../components/layout/ListState'
import { getVacancy } from '../services/api'

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="font-body text-xs text-muted">{label}</p>
        <p className="truncate font-body text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  )
}

export default function VacancyDetail() {
  const { id } = useParams()
  const [vacancy, setVacancy] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getVacancy(id)
      .then(setVacancy)
      .catch((err) => setError(err.message))
  }, [id])

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/vacantes"
        className="mb-6 flex w-fit items-center gap-1.5 font-body text-sm text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a vacantes
      </Link>

      {(error || !vacancy) && <ListState loading={!error} error={error} />}

      {vacancy && (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
          <article className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="relative h-32 bg-night">
              <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-salmon/50 blur-3xl" />
              <span
                title="Guardar (próximamente)"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur"
              >
                <Bookmark className="h-4 w-4" />
              </span>
              <span className="absolute bottom-0 left-6 flex h-16 w-16 translate-y-1/2 items-center justify-center rounded-2xl border-4 border-surface bg-brand font-body text-lg font-bold text-on-brand">
                {vacancy.nombre_empresa.slice(0, 2).toUpperCase()}
              </span>
            </div>

            <div className="p-6 pt-12 sm:p-8 sm:pt-12">
              <h1 className="text-3xl font-medium">{vacancy.nombre_empresa}</h1>
              <p className="mt-1 font-body text-sm font-medium text-brand">{vacancy.sector}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Stat icon={MapPin} label="Ubicación" value={vacancy.ubicacion.zona} />
                <Stat icon={Clock} label="Horas por semana" value={`${vacancy.horarios.horas_por_semana} hrs`} />
                <Stat
                  icon={Wallet}
                  label="Apoyo económico"
                  value={
                    vacancy.estipendio.apoyo_economico
                      ? `$${vacancy.estipendio.monto} ${vacancy.estipendio.moneda}`
                      : 'Sin apoyo'
                  }
                />
              </div>

              <div className="mt-8">
                <h2 className="flex items-center gap-2 text-xl">
                  <GraduationCap className="h-5 w-5 text-brand" />
                  Carreras aceptadas
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {vacancy.requisitos.carreras_aceptadas.map((carrera) => (
                    <span
                      key={carrera}
                      className="rounded-full bg-brand-soft px-3.5 py-1.5 font-body text-xs font-medium text-brand"
                    >
                      {carrera}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-xl">Skills clave</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {vacancy.requisitos.skills_clave.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md border border-line bg-canvas px-3 py-1.5 font-body text-xs text-muted"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled
                title="Próximamente"
                className="mt-10 w-full cursor-not-allowed rounded-lg bg-brand px-5 py-3.5 font-body text-sm font-semibold text-on-brand opacity-50"
              >
                Postular · próximamente
              </button>
            </div>
          </article>

          <EligibilityPanel vacancyId={id} />
        </div>
      )}
    </section>
  )
}
