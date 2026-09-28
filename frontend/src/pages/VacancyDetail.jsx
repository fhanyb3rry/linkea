import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, Building2, MapPin } from 'lucide-react'
import VerifiedBadge from '../components/cards/VerifiedBadge'
import RadialStat from '../components/home/RadialStat'
import { getVacancy } from '../services/api'

export default function VacancyDetail() {
  const { id } = useParams()
  const [vacancy, setVacancy] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getVacancy(id)
      .then(setVacancy)
      .catch((err) => setError(err.message))
  }, [id])

  if (error) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="font-body text-sm text-red-600">{error}</p>
        <Link to="/vacantes" className="mt-4 inline-block font-body text-sm text-cafe-avellana hover:underline">
          Volver a vacantes
        </Link>
      </section>
    )
  }

  if (!vacancy) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="font-body text-sm text-gris-pizarra">Cargando vacante...</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link
        to="/vacantes"
        className="mb-6 flex w-fit items-center gap-1.5 font-body text-sm text-gris-pizarra hover:text-cafe-avellana"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a vacantes
      </Link>

      <div className="rounded-2xl bg-blanco p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-azul-marino font-heading text-sm font-bold text-blanco">
              {vacancy.nombre_empresa.slice(0, 3).toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl">{vacancy.nombre_empresa}</h1>
              <p className="font-body text-sm text-gris-pizarra">{vacancy.sector}</p>
            </div>
          </div>
          <VerifiedBadge label="Empresa verificada" />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 font-body text-sm text-gris-pizarra">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {vacancy.ubicacion.zona}
          </span>
          <span className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" />
            {vacancy.horarios.horas_por_semana} hrs/semana
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            {vacancy.estipendio.apoyo_economico
              ? `$${vacancy.estipendio.monto} ${vacancy.estipendio.moneda}`
              : 'Sin apoyo económico'}
          </span>
        </div>

        <div className="mt-6">
          <h2 className="text-base">Requisitos</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {vacancy.requisitos.carreras_aceptadas.map((carrera) => (
              <span
                key={carrera}
                className="rounded-full bg-azul-marino/10 px-3 py-1 font-body text-xs font-medium text-azul-marino"
              >
                {carrera}
              </span>
            ))}
            {vacancy.requisitos.skills_clave.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-beige-almendra px-3 py-1 font-body text-xs text-gris-pizarra"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between rounded-2xl bg-beige-almendra p-4">
          <div>
            <p className="font-body text-sm font-semibold text-azul-marino">Tu compatibilidad</p>
            <p className="font-body text-xs text-gris-pizarra">Calculada con lógica proposicional + IA</p>
          </div>
          <RadialStat value={92} size={56} />
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-full bg-cafe-avellana px-5 py-3 font-body text-sm font-semibold text-blanco transition-all duration-300 hover:scale-[1.01] hover:opacity-90 active:scale-95"
        >
          Aplicar a esta vacante
        </button>
      </div>
    </section>
  )
}
