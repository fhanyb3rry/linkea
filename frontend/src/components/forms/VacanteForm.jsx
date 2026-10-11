import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { AREA_OPTIONS } from '../../lib/areas'
import { CARRERAS, SKILL_SUGGESTIONS } from '../../lib/perfil'
import { createVacancy, updateVacancy } from '../../services/api'
import ChipInput from './ChipInput'
import DaysPicker from './DaysPicker'
import { FormRow, Select, TextArea, TextInput } from './FormField'
import FormSection from './FormSection'

const DESC_MAX = 800

function toForm(vacancy) {
  return {
    nombreEmpresa: vacancy?.nombre_empresa ?? '',
    sector: vacancy?.sector ?? '',
    zona: vacancy?.ubicacion?.zona ?? '',
    modalidad: vacancy?.modalidad ?? 'presencial',
    horas: vacancy?.horarios?.horas_por_semana ?? '',
    dias: vacancy?.horarios?.dias ?? [],
    carreras: vacancy?.requisitos?.carreras_aceptadas ?? [],
    skills: vacancy?.requisitos?.skills_clave ?? [],
    descripcion: vacancy?.descripcion ?? '',
    apoyo: vacancy?.estipendio?.apoyo_economico ?? false,
    monto: vacancy?.estipendio?.monto ?? '',
  }
}

// mode: 'crear' | 'editar'. En 'editar', `initial` es la vacante guardada.
export default function VacanteForm({ mode, initial }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => toForm(initial))
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  // `value` puede ser una función (prev => nuevo): evita usar listas desactualizadas si se pulsa muy rápido
  const set = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: typeof value === 'function' ? value(prev[field]) : value }))
  const onText = (field) => (event) => set(field)(event.target.value)

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('loading')
    setError(null)

    const payload = {
      nombre_empresa: form.nombreEmpresa.trim(),
      sector: form.sector,
      ubicacion: { zona: form.zona.trim() },
      modalidad: form.modalidad,
      descripcion: form.descripcion.trim(),
      requisitos: { carreras_aceptadas: form.carreras, skills_clave: form.skills },
      estipendio: {
        apoyo_economico: form.apoyo,
        monto: form.apoyo ? Number(form.monto) : null,
        moneda: 'MXN',
      },
      horarios: { horas_por_semana: Number(form.horas), dias: form.dias },
    }

    try {
      if (mode === 'editar') await updateVacancy(initial.id, payload)
      else await createVacancy(payload)
      setStatus('success')
      setTimeout(() => navigate('/empresa'), 900)
    } catch (err) {
      setStatus('idle')
      setError(err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FormSection title="La vacante" description="Lo básico para que los estudiantes la encuentren.">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="Nombre de la empresa *">
            <TextInput value={form.nombreEmpresa} onChange={onText('nombreEmpresa')} placeholder="Acme Tech" required />
          </FormRow>
          <FormRow label="Área profesional *">
            <Select value={form.sector} onChange={onText('sector')} required>
              <option value="" disabled>
                Selecciona un área
              </option>
              {AREA_OPTIONS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
              {/* vacantes antiguas con un sector libre que no es un área: se conserva hasta que se cambie */}
              {form.sector && !AREA_OPTIONS.includes(form.sector) && <option value={form.sector}>{form.sector}</option>}
            </Select>
          </FormRow>
          <FormRow label="Zona / ubicación *">
            <TextInput value={form.zona} onChange={onText('zona')} placeholder="Toluca, Edo. Méx." required />
          </FormRow>
          <FormRow label="Modalidad">
            <Select value={form.modalidad} onChange={onText('modalidad')}>
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
            </Select>
          </FormRow>
        </div>
        <FormRow label="Descripción de la práctica">
          <TextArea
            rows={5}
            maxLength={DESC_MAX}
            value={form.descripcion}
            onChange={onText('descripcion')}
            placeholder="¿Qué hará la persona practicante? ¿Con qué equipo trabajará? ¿Qué aprenderá?"
          />
          <p className="mt-1 text-right font-body text-xs text-muted">
            {form.descripcion.length}/{DESC_MAX}
          </p>
        </FormRow>
      </FormSection>

      <FormSection title="Horario" description="Las horas que se piden y los días en que se trabajará.">
        <FormRow label="Horas por semana *">
          <TextInput
            type="number"
            min="1"
            max="60"
            value={form.horas}
            onChange={onText('horas')}
            placeholder="20"
            required
          />
        </FormRow>
        <FormRow label="Días de trabajo">
          <DaysPicker value={form.dias} onChange={set('dias')} />
        </FormRow>
      </FormSection>

      <FormSection
        title="Requisitos"
        description="Con esto se calcula la elegibilidad: basta con que el estudiante cumpla la carrera o una skill clave."
      >
        <FormRow label="Carreras aceptadas">
          <ChipInput
            value={form.carreras}
            onChange={set('carreras')}
            placeholder="Ingeniería en Sistemas…"
            suggestions={CARRERAS}
          />
        </FormRow>
        <FormRow label="Habilidades clave">
          <ChipInput
            value={form.skills}
            onChange={set('skills')}
            placeholder="Python, React…"
            suggestions={SKILL_SUGGESTIONS}
          />
        </FormRow>
      </FormSection>

      <FormSection title="Apoyo económico">
        <label className="flex items-center gap-2 font-body text-sm text-ink">
          <input
            type="checkbox"
            checked={form.apoyo}
            onChange={(e) => set('apoyo')(e.target.checked)}
            className="h-4 w-4 rounded border-ink/30 accent-[var(--cocoa)]"
          />
          Esta práctica ofrece apoyo económico
        </label>
        {form.apoyo && (
          <FormRow label="Monto mensual (MXN) *">
            <TextInput
              type="number"
              min="1"
              value={form.monto}
              onChange={onText('monto')}
              placeholder="6000"
              required
            />
          </FormRow>
        )}
      </FormSection>

      {error && (
        <p role="alert" className="rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 font-body text-sm text-ink">
          {error}
        </p>
      )}

      {status === 'success' ? (
        <div className="flex items-center gap-2 rounded-xl bg-teal/20 px-4 py-3 font-body text-sm font-medium text-ink">
          <CheckCircle2 className="h-4 w-4" />
          {mode === 'crear' ? '¡Vacante publicada!' : '¡Cambios guardados!'}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-line bg-surface px-5 py-3 font-body text-sm font-semibold text-ink hover:border-cocoa/50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="group flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === 'loading' ? 'Guardando…' : mode === 'crear' ? 'Publicar vacante' : 'Guardar cambios'}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      )}
    </form>
  )
}
