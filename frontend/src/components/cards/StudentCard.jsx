import MatchBadge from './MatchBadge'
import VerifiedBadge from './VerifiedBadge'

export default function StudentCard({ student, matchPercentage }) {
  const { nombre, carrera, semestre, ubicacion, skills, estado } = student

  return (
    <article className="flex flex-col gap-3 rounded-xl bg-blanco p-6 shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-2 hover:scale-[1.03] hover:shadow-[0_12px_24px_rgba(28,42,58,0.18)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg">{nombre}</h3>
          <p className="font-body text-sm text-gris-pizarra">
            {carrera} · {semestre}º semestre
          </p>
        </div>
        <VerifiedBadge label="Alumno verificado" />
      </div>

      <p className="font-body text-sm text-gris-pizarra">{ubicacion?.zona}</p>

      {skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-beige-almendra px-2.5 py-0.5 font-body text-xs text-gris-pizarra"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="font-body text-sm capitalize text-gris-pizarra">{estado}</div>

      <div className="mt-2">
        <MatchBadge percentage={matchPercentage} />
      </div>
    </article>
  )
}
