// Piezas visuales que comparten las secciones del seguimiento.

export function Pill({ estado, mapa }) {
  const { label, className } = mapa[estado] ?? { label: estado, className: 'bg-canvas text-muted' }
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  )
}

export function Seccion({ title, description, children }) {
  return (
    <section className="panel flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        {description && <p className="mt-1 font-body text-xs text-muted">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export function ErrorTexto({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 font-body text-sm text-ink">
      {children}
    </p>
  )
}

export function Vacio({ children }) {
  return <p className="rounded-xl border border-dashed border-line p-6 text-center font-body text-sm text-muted">{children}</p>
}

const ESTILOS = {
  primario: 'bg-brand text-on-brand hover:opacity-90',
  cafe: 'bg-cocoa text-on-cocoa hover:opacity-90',
  verde: 'bg-teal text-on-teal hover:opacity-90',
  borde: 'border border-line bg-surface text-ink hover:border-cocoa/50',
  texto: 'text-muted hover:text-brand',
}

export function Boton({ variante = 'borde', className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-body text-xs font-semibold transition-opacity disabled:opacity-60 ${ESTILOS[variante]} ${className}`}
    />
  )
}
