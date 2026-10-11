import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { setActiveStudent } from '../../hooks/useActiveStudent'
import { CARRERAS, IDIOMA_SUGGESTIONS, SKILL_SUGGESTIONS } from '../../lib/perfil'
import { createStudent, cvUrl, deleteCV, updateStudent, uploadCV } from '../../services/api'
import ChipInput from './ChipInput'
import DaysPicker from './DaysPicker'
import FileDrop from './FileDrop'
import { FormRow, Select, TextArea, TextInput } from './FormField'
import FormSection from './FormSection'

const BIO_MAX = 400

function toForm(student) {
  return {
    nombre: student?.nombre ?? '',
    correo: student?.correo ?? '',
    telefono: student?.telefono ?? '',
    carrera: student?.carrera ?? '',
    semestre: student?.semestre ?? '',
    zona: student?.ubicacion?.zona ?? '',
    horas: student?.disponibilidad?.horas_por_semana ?? '',
    dias: student?.disponibilidad?.dias ?? [],
    skills: student?.skills ?? [],
    idiomas: student?.idiomas ?? [],
    bio: student?.bio ?? '',
    linkedin: student?.enlaces?.linkedin ?? '',
    github: student?.enlaces?.github ?? '',
    portafolio: student?.enlaces?.portafolio ?? '',
    estado: student?.estado ?? 'activo',
  }
}

// mode: 'crear' | 'editar'. En 'editar', `initial` es el estudiante guardado.
export default function PerfilForm({ mode, initial }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => toForm(initial))
  const [cvFile, setCvFile] = useState(null)
  const [removeCV, setRemoveCV] = useState(false)
  const [savedId, setSavedId] = useState(initial?.id ?? null) // evita duplicar el perfil si falla solo el CV
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
      nombre: form.nombre.trim(),
      correo: form.correo.trim(),
      telefono: form.telefono.trim(),
      carrera: form.carrera.trim(),
      semestre: Number(form.semestre),
      ubicacion: { zona: form.zona.trim() },
      skills: form.skills,
      idiomas: form.idiomas,
      bio: form.bio.trim(),
      enlaces: { linkedin: form.linkedin.trim(), github: form.github.trim(), portafolio: form.portafolio.trim() },
      disponibilidad: { horas_por_semana: Number(form.horas), dias: form.dias },
      estado: form.estado,
    }

    let id = savedId
    try {
      const student = id ? await updateStudent(id, payload) : await createStudent(payload)
      id = student.id
      setSavedId(id)
    } catch (err) {
      setStatus('idle')
      setError(err.message)
      return
    }

    try {
      if (removeCV && !cvFile) await deleteCV(id)
      if (cvFile) await uploadCV(id, cvFile)
    } catch (err) {
      setStatus('idle')
      setCvFile(null)
      setError(`Tu perfil se guardó, pero el currículum no se pudo subir: ${err.message}`)
      return
    }

    if (mode === 'crear') setActiveStudent(id)
    setStatus('success')
    setTimeout(() => navigate(`/estudiantes/${id}`), 900)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FormSection title="Datos personales" description="Así te verán las empresas.">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="Nombre completo *">
            <TextInput value={form.nombre} onChange={onText('nombre')} placeholder="Ana Pérez" required />
          </FormRow>
          <FormRow label="Correo de contacto">
            <TextInput type="email" value={form.correo} onChange={onText('correo')} placeholder="ana@correo.com" />
          </FormRow>
          <FormRow label="Teléfono">
            <TextInput type="tel" value={form.telefono} onChange={onText('telefono')} placeholder="722 123 4567" />
          </FormRow>
          <FormRow label="Zona / ubicación *">
            <TextInput value={form.zona} onChange={onText('zona')} placeholder="Toluca, Edo. Méx." required />
          </FormRow>
        </div>
      </FormSection>

      <FormSection title="Información académica">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="Carrera *">
            <TextInput
              list="carreras"
              value={form.carrera}
              onChange={onText('carrera')}
              placeholder="Ingeniería en Sistemas"
              required
            />
            <datalist id="carreras">
              {CARRERAS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </FormRow>
          <FormRow label="Semestre *">
            <TextInput
              type="number"
              min="1"
              max="12"
              value={form.semestre}
              onChange={onText('semestre')}
              placeholder="7"
              required
            />
          </FormRow>
        </div>
      </FormSection>

      <FormSection title="Disponibilidad" description="Las horas y los días en que podrías hacer tus prácticas.">
        <div className="grid gap-5 sm:grid-cols-2">
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
          {mode === 'editar' && (
            <FormRow label="Estado">
              <Select value={form.estado} onChange={onText('estado')}>
                <option value="activo">Disponible</option>
                <option value="en_proceso">En proceso</option>
                <option value="colocado">Colocado</option>
              </Select>
            </FormRow>
          )}
        </div>
        <FormRow label="Días disponibles">
          <DaysPicker value={form.dias} onChange={set('dias')} />
        </FormRow>
      </FormSection>

      <FormSection
        title="Habilidades e idiomas"
        description="Escribe y presiona Enter para agregar. Las habilidades alimentan tu compatibilidad con cada vacante."
      >
        <FormRow label="Habilidades">
          <ChipInput
            value={form.skills}
            onChange={set('skills')}
            placeholder="Python, SQL, Figma…"
            suggestions={SKILL_SUGGESTIONS}
          />
        </FormRow>
        <FormRow label="Idiomas">
          <ChipInput
            value={form.idiomas}
            onChange={set('idiomas')}
            placeholder="Inglés B2…"
            suggestions={IDIOMA_SUGGESTIONS}
          />
        </FormRow>
      </FormSection>

      <FormSection title="Sobre ti y enlaces">
        <FormRow label="Cuéntanos sobre ti">
          <TextArea
            rows={4}
            maxLength={BIO_MAX}
            value={form.bio}
            onChange={onText('bio')}
            placeholder="¿Qué buscas aprender? ¿En qué proyectos has trabajado?"
          />
          <p className="mt-1 text-right font-body text-xs text-muted">
            {form.bio.length}/{BIO_MAX}
          </p>
        </FormRow>
        <div className="grid gap-5 sm:grid-cols-3">
          <FormRow label="LinkedIn">
            <TextInput value={form.linkedin} onChange={onText('linkedin')} placeholder="https://linkedin.com/in/…" />
          </FormRow>
          <FormRow label="GitHub">
            <TextInput value={form.github} onChange={onText('github')} placeholder="https://github.com/…" />
          </FormRow>
          <FormRow label="Portafolio">
            <TextInput value={form.portafolio} onChange={onText('portafolio')} placeholder="https://…" />
          </FormRow>
        </div>
      </FormSection>

      <FormSection title="Currículum" description="Las empresas podrán verlo y descargarlo desde tu perfil.">
        <FileDrop
          file={cvFile}
          onFile={setCvFile}
          existing={initial?.cv}
          removed={removeCV}
          onRemoveExisting={() => setRemoveCV(true)}
          downloadHref={initial?.id ? cvUrl(initial.id) : undefined}
        />
        {removeCV && initial?.cv && !cvFile && (
          <p className="font-body text-xs text-muted">
            Se eliminará tu currículum al guardar.{' '}
            <button type="button" onClick={() => setRemoveCV(false)} className="font-semibold text-brand hover:underline">
              Deshacer
            </button>
          </p>
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
          {mode === 'crear' ? '¡Perfil creado! Abriendo tu perfil…' : '¡Cambios guardados!'}
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
            {status === 'loading' ? 'Guardando…' : mode === 'crear' ? 'Crear perfil' : 'Guardar cambios'}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      )}
    </form>
  )
}
