import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/auth'
import { AREA_OPTIONS } from '../../lib/areas'
import { createOrganization, updateOrganization } from '../../services/api'
import { FormRow, Select, TextArea, TextInput } from './FormField'
import FormSection from './FormSection'

const DESC_MAX = 800

function toForm(org) {
  return {
    nombre: org?.nombre ?? '',
    sector: org?.sector ?? '',
    zona: org?.ubicacion?.zona ?? '',
    descripcion: org?.descripcion ?? '',
    correo: org?.contacto?.correo ?? '',
    telefono: org?.contacto?.telefono ?? '',
    sitio: org?.contacto?.sitio ?? '',
    responsable: org?.contacto?.responsable ?? '',
    cargo: org?.contacto?.cargo ?? '',
  }
}

// mode: 'crear' | 'editar'. En 'editar', `initial` es la organización guardada.
export default function OrganizacionForm({ mode, initial, onSaved }) {
  const navigate = useNavigate()
  const { usuario, refresh } = useAuth()
  const [form, setForm] = useState(() => toForm(initial ?? { nombre: usuario?.nombre }))
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const onText = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('loading')
    setError(null)

    const payload = {
      nombre: form.nombre.trim(),
      sector: form.sector,
      ubicacion: { zona: form.zona.trim() },
      descripcion: form.descripcion.trim(),
      contacto: {
        correo: form.correo.trim(),
        telefono: form.telefono.trim(),
        sitio: form.sitio.trim(),
        responsable: form.responsable.trim(),
        cargo: form.cargo.trim(),
      },
    }

    try {
      if (mode === 'editar') await updateOrganization(initial.id, payload)
      else {
        await createOrganization(payload)
        await refresh() // la cuenta ya quedó ligada a su organización
      }
      setStatus('success')
      if (onSaved) onSaved()
      else setTimeout(() => navigate('/empresa'), 900)
    } catch (err) {
      setStatus('idle')
      setError(err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FormSection title="La organización" description="Así la verán los estudiantes y la coordinación de estadías.">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="Nombre *">
            <TextInput value={form.nombre} onChange={onText('nombre')} placeholder="Acme Tech" required minLength={2} maxLength={120} />
          </FormRow>
          <FormRow label="Área principal *">
            <Select value={form.sector} onChange={onText('sector')} required>
              <option value="" disabled>
                Selecciona un área
              </option>
              {AREA_OPTIONS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="Zona / ubicación *">
            <TextInput value={form.zona} onChange={onText('zona')} placeholder="Toluca, Edo. Méx." required />
          </FormRow>
          <FormRow label="Sitio web">
            <TextInput type="url" value={form.sitio} onChange={onText('sitio')} placeholder="https://acme.mx" />
          </FormRow>
        </div>
        <FormRow label="Descripción">
          <TextArea
            rows={4}
            maxLength={DESC_MAX}
            value={form.descripcion}
            onChange={onText('descripcion')}
            placeholder="¿A qué se dedica? ¿Qué tipo de proyectos pueden hacer los practicantes?"
          />
          <p className="mt-1 text-right font-body text-xs text-muted">
            {form.descripcion.length}/{DESC_MAX}
          </p>
        </FormRow>
      </FormSection>

      <FormSection
        title="Contacto y asesor empresarial"
        description="La persona que acompaña al practicante y firma sus documentos de estadía."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="Nombre del asesor empresarial">
            <TextInput value={form.responsable} onChange={onText('responsable')} placeholder="Lic. Andrea Ruiz" />
          </FormRow>
          <FormRow label="Cargo">
            <TextInput value={form.cargo} onChange={onText('cargo')} placeholder="Recursos Humanos" />
          </FormRow>
          <FormRow label="Correo de contacto">
            <TextInput type="email" value={form.correo} onChange={onText('correo')} placeholder="rh@acme.mx" />
          </FormRow>
          <FormRow label="Teléfono">
            <TextInput type="tel" value={form.telefono} onChange={onText('telefono')} placeholder="722 123 4567" />
          </FormRow>
        </div>
      </FormSection>

      {error && (
        <p role="alert" className="rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 font-body text-sm text-ink">
          {error}
        </p>
      )}

      {status === 'success' ? (
        <div className="flex items-center gap-2 rounded-xl bg-teal/20 px-4 py-3 font-body text-sm font-medium text-ink">
          <CheckCircle2 className="h-4 w-4" />
          {mode === 'crear' ? '¡Organización registrada!' : '¡Cambios guardados!'}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {mode === 'editar' && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-line bg-surface px-5 py-3 font-body text-sm font-semibold text-ink hover:border-cocoa/50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="group flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === 'loading' ? 'Guardando…' : mode === 'crear' ? 'Registrar organización' : 'Guardar cambios'}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      )}
    </form>
  )
}
