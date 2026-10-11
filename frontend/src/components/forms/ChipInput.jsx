import { useState } from 'react'
import { Plus, X } from 'lucide-react'

// Lista de etiquetas editable: se agrega con Enter o coma, se quita con la X. Controlado (value / onChange).
export default function ChipInput({ value, onChange, placeholder, suggestions = [], id }) {
  const [draft, setDraft] = useState('')

  function add(raw) {
    const text = raw.trim()
    if (!text) return
    onChange((prev) => (prev.some((v) => v.toLowerCase() === text.toLowerCase()) ? prev : [...prev, text]))
    setDraft('')
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(draft)
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange((prev) => prev.slice(0, -1))
    }
  }

  const available = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink/15 bg-surface px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        {value.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1 rounded-full border border-line bg-canvas py-1 pl-3 pr-1.5 font-body text-xs text-ink"
          >
            {item}
            <button
              type="button"
              aria-label={`Quitar ${item}`}
              onClick={() => onChange((prev) => prev.filter((v) => v !== item))}
              className="flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length ? 'Agregar otra…' : placeholder}
          className="min-w-32 flex-1 bg-transparent py-1 font-body text-sm text-ink outline-none placeholder:text-muted/60"
        />
      </div>

      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-body text-xs text-muted">Sugeridas:</span>
          {available.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 font-body text-xs text-muted transition-colors hover:border-cocoa hover:text-ink"
            >
              <Plus className="h-3 w-3" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
