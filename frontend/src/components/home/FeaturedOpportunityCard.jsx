import { Bookmark, Building2, Laptop, MapPin, Repeat } from 'lucide-react'

const modalidadIcon = {
  remoto: Laptop,
  presencial: Building2,
  hibrido: Repeat,
}

export default function FeaturedOpportunityCard({ opportunity }) {
  const { logoIniciales, matchPercentage, nombre, categoria, zona, modalidad, skills } = opportunity
  const ModalidadIcon = modalidadIcon[modalidad] ?? Building2

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-blanco shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-2 hover:scale-[1.03] hover:shadow-[0_12px_24px_rgba(28,42,58,0.18)]">
      <div className="relative h-28 bg-gradient-to-br from-azul-marino/15 to-cafe-avellana/20">
        <button
          type="button"
          aria-label="Guardar"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blanco/90 text-azul-marino shadow-sm transition-all duration-200 hover:scale-110 hover:text-cafe-avellana active:scale-95"
        >
          <Bookmark className="h-4 w-4" />
        </button>
        <span className="absolute -bottom-3 left-3 flex items-center gap-1 rounded-full bg-cafe-avellana px-3 py-1 font-body text-xs font-semibold text-blanco shadow-sm transition-transform duration-300 group-hover:scale-105">
          + {matchPercentage}% Match
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-azul-marino font-heading text-xs font-bold text-blanco">
            {logoIniciales}
          </span>
          <div>
            <p className="font-body text-sm font-semibold text-azul-marino">{nombre}</p>
            <p className="font-body text-xs text-gris-pizarra">{categoria}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-body text-xs text-gris-pizarra">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {zona}
          </span>
          <span className="flex items-center gap-1 capitalize">
            <ModalidadIcon className="h-3.5 w-3.5" />
            {modalidad}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-beige-almendra px-2.5 py-0.5 font-body text-xs text-gris-pizarra"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
