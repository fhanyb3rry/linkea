import { Link } from 'react-router-dom'
import MatchBadge from './MatchBadge'
import VerifiedBadge from './VerifiedBadge'

export default function VacancyCard({ vacancy, matchPercentage }) {
  const { id, nombre_empresa, sector, ubicacion, requisitos, estipendio, horarios } = vacancy

  return (
    <Link
      to={`/vacantes/${id}`}
      className="flex flex-col gap-3 rounded-xl bg-blanco p-6 shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-2 hover:scale-[1.03] hover:shadow-[0_12px_24px_rgba(28,42,58,0.18)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg">{nombre_empresa}</h3>
          <p className="font-body text-sm text-gris-pizarra">{sector}</p>
        </div>
        <VerifiedBadge label="Empresa verificada" />
      </div>

      <p className="font-body text-sm text-gris-pizarra">{ubicacion?.zona}</p>

      {requisitos?.skills_clave?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {requisitos.skills_clave.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-beige-almendra px-2.5 py-0.5 font-body text-xs text-gris-pizarra"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between font-body text-sm text-gris-pizarra">
        <span>{horarios?.horas_por_semana ?? '-'} hrs/semana</span>
        <span>{estipendio?.apoyo_economico ? `$${estipendio.monto} ${estipendio.moneda}` : 'Sin apoyo económico'}</span>
      </div>

      <div className="mt-2">
        <MatchBadge percentage={matchPercentage} />
      </div>
    </Link>
  )
}
