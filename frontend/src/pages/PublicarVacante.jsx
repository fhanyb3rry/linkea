import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { FormRow, TextArea, TextInput } from '../components/forms/FormField'
import { createVacancy } from '../services/api'

const initialForm = {
  nombreEmpresa: '',
  sector: '',
  zona: '',
  carreras: '',
  skills: '',
  apoyoEconomico: false,
  monto: '',
  horasPorSemana: '',
}

export default function PublicarVacante() {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setError(null)

    try {
      await createVacancy({
        nombre_empresa: form.nombreEmpresa,
        sector: form.sector,
        ubicacion: { zona: form.zona },
        requisitos: {
          carreras_aceptadas: form.carreras.split(',').map((s) => s.trim()).filter(Boolean),
          skills_clave: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        },
        estipendio: {
          apoyo_economico: form.apoyoEconomico,
          monto: form.apoyoEconomico ? Number(form.monto) : null,
          moneda: 'MXN',
        },
        horarios: { horas_por_semana: Number(form.horasPorSemana), dias: [] },
      })
      setStatus('success')
      setTimeout(() => navigate('/vacantes'), 1200)
    } catch (err) {
      setStatus('idle')
      setError(err.message)
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl">Publica una vacante</h1>
      <p className="mt-1 font-body text-sm text-muted">
        Al publicar, Linkea evalúa automáticamente qué estudiantes son compatibles.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5 rounded-2xl bg-surface p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="Nombre de la empresa">
            <TextInput
              value={form.nombreEmpresa}
              onChange={handleChange('nombreEmpresa')}
              placeholder="Acme Tech"
              required
            />
          </FormRow>
          <FormRow label="Sector">
            <TextInput value={form.sector} onChange={handleChange('sector')} placeholder="Tecnología" required />
          </FormRow>
          <FormRow label="Zona / ubicación">
            <TextInput value={form.zona} onChange={handleChange('zona')} placeholder="Toluca, Edo. Méx." required />
          </FormRow>
          <FormRow label="Horas requeridas por semana">
            <TextInput
              type="number"
              min="1"
              value={form.horasPorSemana}
              onChange={handleChange('horasPorSemana')}
              placeholder="20"
              required
            />
          </FormRow>
        </div>

        <FormRow label="Carreras aceptadas (separadas por coma)">
          <TextInput
            value={form.carreras}
            onChange={handleChange('carreras')}
            placeholder="Ingeniería en Sistemas, Ingeniería en Software"
          />
        </FormRow>

        <FormRow label="Habilidades clave (separadas por coma)">
          <TextArea
            rows={3}
            value={form.skills}
            onChange={handleChange('skills')}
            placeholder="Python, React, Trabajo en equipo"
          />
        </FormRow>

        <label className="flex items-center gap-2 font-body text-sm text-muted">
          <input
            type="checkbox"
            checked={form.apoyoEconomico}
            onChange={handleChange('apoyoEconomico')}
            className="h-4 w-4 rounded border-ink/30 text-brand focus:ring-brand/30"
          />
          Ofrece apoyo económico
        </label>

        {form.apoyoEconomico && (
          <FormRow label="Monto mensual (MXN)">
            <TextInput type="number" min="0" value={form.monto} onChange={handleChange('monto')} placeholder="6000" />
          </FormRow>
        )}

        {error && <p className="font-body text-sm text-red-600">{error}</p>}

        {status === 'success' ? (
          <div className="flex items-center gap-2 rounded-xl bg-brand/10 px-4 py-3 font-body text-sm font-medium text-brand">
            <CheckCircle2 className="h-4 w-4" />
            ¡Vacante publicada! Redirigiendo...
          </div>
        ) : (
          <button
            type="submit"
            disabled={status === 'loading'}
            className="group flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 font-body text-sm font-semibold text-on-brand transition-all duration-300 hover:scale-[1.02] hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {status === 'loading' ? 'Publicando...' : 'Publicar vacante'}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        )}
      </form>
    </section>
  )
}
