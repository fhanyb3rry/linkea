import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="font-heading text-8xl font-medium text-cocoa">404</p>
      <h1 className="text-3xl">No encontramos esta página</h1>
      <p className="font-body text-sm text-muted">
        Puede que el enlace esté mal escrito o que la página ya no exista.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link
          to="/inicio"
          className="rounded-lg bg-brand px-5 py-3 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
        >
          Ir al inicio
        </Link>
        <Link
          to="/vacantes"
          className="rounded-lg border border-line bg-surface px-5 py-3 font-body text-sm font-semibold text-ink hover:border-cocoa/50"
        >
          Ver vacantes
        </Link>
      </div>
    </section>
  )
}
