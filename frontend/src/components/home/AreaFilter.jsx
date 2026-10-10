// Filtro por área profesional: chips con contador. Controlado desde fuera (value / onChange).
export default function AreaFilter({ options, value, onChange }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-ink/5 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-medium">Explora por área profesional</h3>
        <p className="font-body text-xs text-muted">Elige un área para ver solo sus vacantes.</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar vacantes por área">
        {options.map(({ id, label, count }) => {
          const active = id === value
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 font-body text-xs font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-200 motion-reduce:transition-none ${
                active
                  ? 'border-brand bg-brand text-on-brand shadow-sm shadow-brand/25'
                  : 'border-line bg-canvas text-muted hover:-translate-y-px hover:border-brand/40 hover:text-ink'
              }`}
            >
              {label}
              <span
                className={`rounded-full px-1.5 text-[10px] leading-4 ${
                  active ? 'bg-white/20 text-on-brand' : 'bg-brand-soft text-brand'
                } ${count === 0 && !active ? 'opacity-50' : ''}`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
