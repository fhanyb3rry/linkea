export default function InfoFloatCard({ icon: Icon, title, description, trailing, glass = false, className = '' }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl p-4 shadow-lg transition-transform duration-300 hover:-translate-y-1 ${
        glass ? 'border border-blanco/60 bg-blanco/80 backdrop-blur-md' : 'bg-blanco'
      } ${className}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-beige-almendra text-cafe-avellana">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm font-semibold leading-snug text-azul-marino">{title}</p>
        {description && <p className="mt-1 font-body text-xs leading-snug text-gris-pizarra">{description}</p>}
      </div>
      {trailing && <div className="shrink-0 self-center">{trailing}</div>}
    </div>
  )
}
