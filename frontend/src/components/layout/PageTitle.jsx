import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Encabezado estándar de las pantallas: enlace de regreso opcional, título, subtítulo y acciones.
export default function PageTitle({ title, subtitle, back, children }) {
  return (
    <header className="flex flex-col gap-4">
      {back && (
        <Link
          to={back.to}
          className="flex w-fit items-center gap-1.5 font-body text-sm text-muted transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-medium">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl font-body text-sm text-muted">{subtitle}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </header>
  )
}
