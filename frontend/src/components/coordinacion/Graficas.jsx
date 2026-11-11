// Gráficas sin dependencias (SVG + CSS). Colores con las variables del tema, así cambian solas en modo oscuro.
const PALETA = ['var(--brand)', 'var(--teal)', 'var(--accent)', 'var(--caramel)', 'var(--salmon)', 'var(--latte)']

// Dona: proporción de cada categoría sobre el total. items = [[etiqueta, n], ...]
export function Dona({ items, centro = 'Total' }) {
  const total = items.reduce((s, [, n]) => s + n, 0)
  if (total === 0) return <p className="font-body text-sm text-muted">Sin datos todavía.</p>

  const r = 40
  const c = 2 * Math.PI * r
  let acumulado = 0
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0 -rotate-90" role="img" aria-label="Distribución">
        {items.map(([label, n], i) => {
          const largo = (n / total) * c
          const arco = (
            <circle
              key={label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={PALETA[i % PALETA.length]}
              strokeWidth="16"
              strokeDasharray={`${largo} ${c - largo}`}
              strokeDashoffset={-acumulado}
            />
          )
          acumulado += largo
          return arco
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center fill-ink font-heading text-[18px]">
          {total}
        </text>
        <title>{centro}</title>
      </svg>
      <ul className="flex flex-col gap-1.5 font-body text-sm">
        {items.map(([label, n], i) => (
          <li key={label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: PALETA[i % PALETA.length] }} />
            <span className="text-ink">{label}</span>
            <span className="font-semibold text-ink">{n}</span>
            <span className="text-xs text-muted">({Math.round((n / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Barras horizontales: ranking de categorías con el número al final. items = [[etiqueta, n], ...]
export function BarrasH({ items, color = 'var(--brand)' }) {
  if (items.length === 0) return <p className="font-body text-sm text-muted">Sin datos todavía.</p>
  const max = Math.max(...items.map(([, n]) => n), 1)
  return (
    <ul className="flex flex-col gap-3">
      {items.map(([label, n]) => (
        <li key={label} className="font-body text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-ink">{label}</span>
            <span className="font-semibold text-ink">{n}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-cocoa-soft">
            <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
