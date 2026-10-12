import { Plus, Trash2 } from 'lucide-react'
import { SKILL_SUGGESTIONS } from '../../lib/perfil'
import ChipInput from './ChipInput'
import { FormRow, TextArea, TextInput } from './FormField'

const PROYECTO_VACIO = { nombre: '', descripcion: '', tecnologias: [], enlace: '' }

// Lista editable de proyectos del estudiante. Controlado: `value` es la lista y `onChange` recibe
// la nueva (o una función prev => nueva, igual que el resto de campos del formulario).
export default function ProyectosEditor({ value, onChange }) {
  const update = (i, field) => (v) =>
    onChange((prev) =>
      prev.map((p, k) => (k === i ? { ...p, [field]: typeof v === 'function' ? v(p[field]) : v } : p)),
    )
  const onText = (i, field) => (e) => update(i, field)(e.target.value)

  return (
    <div className="flex flex-col gap-4">
      {value.map((p, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border border-line p-4">
          <div className="flex items-start gap-3">
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <FormRow label="Nombre del proyecto *">
                <TextInput
                  value={p.nombre}
                  onChange={onText(i, 'nombre')}
                  placeholder="Sistema de inventario"
                  required
                  minLength={2}
                  maxLength={120}
                />
              </FormRow>
              <FormRow label="Enlace">
                <TextInput type="url" value={p.enlace} onChange={onText(i, 'enlace')} placeholder="https://github.com/…" />
              </FormRow>
            </div>
            <button
              type="button"
              onClick={() => onChange((prev) => prev.filter((_, k) => k !== i))}
              aria-label={`Quitar proyecto ${p.nombre || i + 1}`}
              className="mt-7 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:text-brand"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <FormRow label="Descripción">
            <TextArea
              rows={2}
              maxLength={500}
              value={p.descripcion}
              onChange={onText(i, 'descripcion')}
              placeholder="¿Qué hiciste y qué resultado tuvo?"
            />
          </FormRow>
          <FormRow label="Tecnologías">
            <ChipInput
              value={p.tecnologias}
              onChange={update(i, 'tecnologias')}
              placeholder="React, SQL…"
              suggestions={SKILL_SUGGESTIONS}
            />
          </FormRow>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange((prev) => [...prev, { ...PROYECTO_VACIO }])}
        className="flex w-fit items-center gap-2 rounded-lg border border-dashed border-line px-4 py-2.5 font-body text-sm font-semibold text-ink hover:border-cocoa/50"
      >
        <Plus className="h-4 w-4" />
        Agregar proyecto
      </button>
    </div>
  )
}
