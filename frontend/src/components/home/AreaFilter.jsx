import { Compass } from 'lucide-react'

// Filtro por área profesional: chips con ícono y contador. Controlado desde fuera (value / onChange).
export default function AreaFilter({ options, value, onChange }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3">
        <span className="tile flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Compass className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-medium leading-tight">Explora por área profesional</h3>
          <p className="font-body text-xs text-muted">Elige un área y mira solo sus vacantes.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5" role="group" aria-label="Filtrar vacantes por área">
        {options.map(({ id, label, count, icon: Icon }) => {
          const active = id === value
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(id)}
              className={`group flex items-center gap-2 rounded-xl border px-3.5 py-2 font-body text-xs font-medium transition-[background-color,color,border-color,box-shadow,translate] duration-300 motion-reduce:transition-none ${
                active
                  ? 'tile border-transparent shadow-lg shadow-cocoa/30'
                  : 'border-line bg-canvas text-muted hover:-translate-y-0.5 hover:border-cocoa/40 hover:bg-surface hover:text-ink hover:shadow-md hover:shadow-cocoa/10'
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-transform duration-300 ${
                  active ? '' : 'text-cocoa group-hover:scale-110'
                }`}
              />
              {label}
              <span
                className={`rounded-md px-1.5 text-[10px] font-semibold leading-5 ${
                  active ? 'bg-current/15' : 'bg-cocoa-soft text-cocoa'
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
