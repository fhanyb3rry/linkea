import { Link } from 'react-router-dom'
import { AlertCircle, Inbox } from 'lucide-react'

// Estados de una lista: cargando (skeleton), error, vacía.
export default function ListState({ loading, error, empty, emptyText, actionTo, actionLabel }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl border border-line bg-surface" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft p-5">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div>
          <p className="font-body text-sm font-semibold text-ink">No pudimos cargar la información</p>
          <p className="mt-1 font-body text-sm text-muted">{error}. Revisa que el backend esté corriendo.</p>
        </div>
      </div>
    )
  }

  if (empty) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line p-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Inbox className="h-5 w-5" />
        </span>
        <p className="font-body text-sm text-muted">{emptyText}</p>
        {actionTo && (
          <Link
            to={actionTo}
            className="rounded-lg bg-brand px-4 py-2 font-body text-xs font-semibold text-on-brand transition-opacity hover:opacity-90"
          >
            {actionLabel}
          </Link>
        )}
      </div>
    )
  }

  return null
}
