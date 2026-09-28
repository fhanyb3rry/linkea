import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { FormRow, TextArea, TextInput } from '../components/forms/FormField'
import { createStudent } from '../services/api'

const initialForm = {
  nombre: '',
  carrera: '',
  semestre: '',
  zona: '',
  skills: '',
  horasPorSemana: '',
}

export default function CrearPerfilEstudiante() {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setError(null)

    try {
      await createStudent({
        nombre: form.nombre,
        carrera: form.carrera,
        semestre: Number(form.semestre),
        ubicacion: { zona: form.zona },
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        disponibilidad: { horas_por_semana: Number(form.horasPorSemana), dias: [] },
      })
      setStatus('success')
      setTimeout(() => navigate('/estudiantes'), 1200)
    } catch (err) {
      setStatus('idle')
      setError(err.message)
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl">Crea tu perfil de estudiante</h1>
      <p className="mt-1 font-body text-sm text-gris-pizarra">
        Con esta información, nuestro motor de matching encuentra las vacantes más compatibles
        contigo.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5 rounded-2xl bg-blanco p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="Nombre completo">
            <TextInput value={form.nombre} onChange={handleChange('nombre')} placeholder="Ana Pérez" required />
          </FormRow>
          <FormRow label="Carrera">
            <TextInput
              value={form.carrera}
              onChange={handleChange('carrera')}
              placeholder="Ingeniería en Sistemas"
              required
            />
          </FormRow>
          <FormRow label="Semestre">
            <TextInput
              type="number"
              min="1"
              max="12"
              value={form.semestre}
              onChange={handleChange('semestre')}
              placeholder="7"
              required
            />
          </FormRow>
          <FormRow label="Zona / ubicación">
            <TextInput value={form.zona} onChange={handleChange('zona')} placeholder="Toluca, Edo. Méx." required />
          </FormRow>
          <FormRow label="Horas disponibles por semana">
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

        <FormRow label="Habilidades (separadas por coma)">
          <TextArea
            rows={3}
            value={form.skills}
            onChange={handleChange('skills')}
            placeholder="Python, SQL, React, Trabajo en equipo"
          />
        </FormRow>

        {error && <p className="font-body text-sm text-red-600">{error}</p>}

        {status === 'success' ? (
          <div className="flex items-center gap-2 rounded-xl bg-cafe-avellana/10 px-4 py-3 font-body text-sm font-medium text-cafe-avellana">
            <CheckCircle2 className="h-4 w-4" />
            ¡Perfil creado! Redirigiendo...
          </div>
        ) : (
          <button
            type="submit"
            disabled={status === 'loading'}
            className="group flex items-center justify-center gap-2 rounded-full bg-cafe-avellana px-5 py-3 font-body text-sm font-semibold text-blanco transition-all duration-300 hover:scale-[1.02] hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {status === 'loading' ? 'Guardando...' : 'Crear perfil'}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        )}
      </form>
    </section>
  )
}
