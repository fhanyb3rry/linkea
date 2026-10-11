import { ESTADOS } from '../../lib/estados'

// Estado de una postulación.
export default function EstadoBadge({ estado }) {
  const { label, className } = ESTADOS[estado] ?? ESTADOS.enviada
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  )
}
