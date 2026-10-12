import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'

// Aviso para las pantallas que necesitan el perfil de estudiante de la cuenta.
export default function NeedsProfile({ text = 'Crea tu perfil de estudiante para continuar.' }) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cocoa-soft text-cocoa">
        <UserRound className="h-5 w-5" />
      </span>
      <p className="font-heading text-xl text-ink">Primero necesitas un perfil</p>
      <p className="max-w-sm font-body text-sm text-muted">{text}</p>
      <Link
        to="/perfil/crear"
        className="mt-1 rounded-lg bg-brand px-5 py-2.5 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
      >
        Crear mi perfil
      </Link>
    </div>
  )
}
