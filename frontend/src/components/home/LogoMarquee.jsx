const companies = [
  'GPP Soluciones',
  'Stellantis',
  'Tecnológico de Monterrey',
  'Nestlé',
  'Acme Tech',
  'Beta Marketing',
  'Grupo Modelo',
  'BBVA México',
]

export default function LogoMarquee() {
  const track = [...companies, ...companies]

  return (
    <div className="relative overflow-hidden border-y border-azul-marino/10 bg-blanco py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-blanco to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-blanco to-transparent" />

      <div className="flex w-max animate-[marquee_28s_linear_infinite] items-center gap-12 px-6 hover:[animation-play-state:paused]">
        {track.map((name, index) => (
          <span
            key={`${name}-${index}`}
            className="whitespace-nowrap font-heading text-lg font-semibold text-azul-marino/30"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
