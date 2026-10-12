import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Briefcase, GraduationCap, Sparkles } from 'lucide-react'
import { FormRow, TextInput } from '../components/forms/FormField'
import { inicioDe, useAuth } from '../context/auth'

export default function Register() {
  const navigate = useNavigate()
  const { usuario, register } = useAuth()
  const [role, setRole] = useState('estudiante')
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (usuario) return <Navigate to={inicioDe(usuario)} replace />

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const u = await register({ ...form, rol: role })
      // El estudiante sigue con su perfil; la empresa, a su panel.
      navigate(u.rol === 'empresa' ? '/empresa' : inicioDe(u), { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-6 flex items-center gap-2 font-heading text-xl font-semibold text-ink">
        <Sparkles className="h-5 w-5 text-brand" />
        Linkea
      </div>

      <h1 className="text-2xl">Crea tu cuenta</h1>
      <p className="mt-1 font-body text-sm text-muted">Elige cómo quieres usar Linkea.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRole('estudiante')}
          className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
            role === 'estudiante'
              ? 'border-brand bg-brand/10'
              : 'border-ink/15 bg-surface hover:bg-canvas'
          }`}
        >
          <GraduationCap className={`h-6 w-6 ${role === 'estudiante' ? 'text-brand' : 'text-ink'}`} />
          <span className="font-body text-sm font-medium text-ink">Soy estudiante</span>
        </button>
        <button
          type="button"
          onClick={() => setRole('empresa')}
          className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
            role === 'empresa'
              ? 'border-brand bg-brand/10'
              : 'border-ink/15 bg-surface hover:bg-canvas'
          }`}
        >
          <Briefcase className={`h-6 w-6 ${role === 'empresa' ? 'text-brand' : 'text-ink'}`} />
          <span className="font-body text-sm font-medium text-ink">Soy empresa</span>
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <FormRow label={role === 'empresa' ? 'Nombre de la empresa' : 'Nombre completo'}>
          <TextInput
            type="text"
            placeholder={role === 'empresa' ? 'Nombre de la empresa' : 'Tu nombre'}
            autoComplete={role === 'empresa' ? 'organization' : 'name'}
            required
            minLength={2}
            maxLength={120}
            value={form.nombre}
            onChange={set('nombre')}
          />
        </FormRow>
        <FormRow label="Correo electrónico">
          <TextInput
            type="email"
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
            required
            value={form.email}
            onChange={set('email')}
          />
        </FormRow>
        <FormRow label="Contraseña (mínimo 8 caracteres)">
          <TextInput
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={form.password}
            onChange={set('password')}
          />
        </FormRow>

        {error && <p className="rounded-xl bg-brand-soft p-3 font-body text-xs text-ink">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="group mt-2 flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 font-body text-sm font-semibold text-on-brand transition-all duration-300 hover:scale-[1.02] hover:opacity-90 active:scale-95 disabled:opacity-60"
        >
          {busy ? 'Creando cuenta…' : 'Crear cuenta'}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </form>

      <p className="mt-6 text-center font-body text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Inicia sesión
        </Link>
      </p>
    </section>
  )
}
