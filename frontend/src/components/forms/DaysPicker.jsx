import { DIAS } from '../../lib/perfil'

// Selector de días de la semana (varios). Controlado (value: string[] / onChange).
export default function DaysPicker({ value, onChange }) {
  function toggle(day) {
    onChange((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Días disponibles">
      {DIAS.map((day) => {
        const active = value.includes(day)
        return (
          <button
            key={day}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(day)}
            className={`h-10 w-12 rounded-xl border font-body text-xs font-medium transition-colors ${
              active
                ? 'border-cocoa bg-cocoa text-on-cocoa'
                : 'border-line bg-surface text-muted hover:border-cocoa/50 hover:text-ink'
            }`}
          >
            {day}
          </button>
        )
      })}
    </div>
  )
}
