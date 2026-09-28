export default function StatItem({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blanco text-cafe-avellana shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <div className="leading-tight">
        <p className="font-heading text-lg font-semibold text-azul-marino">{value}</p>
        <p className="font-body text-xs text-gris-pizarra">{label}</p>
      </div>
    </div>
  )
}
