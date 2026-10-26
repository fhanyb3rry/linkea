import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { FormRow, TextInput } from '../components/forms/FormField'
import { inicioDe, useAuth } from '../context/auth'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (usuario) return <Navigate to={inicioDe(usuario)} replace />

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const u = await login(email, password)
      // Regresa a la página que pidió antes de entrar (si la había).
      navigate(location.state?.from ?? inicioDe(u), { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="glass-strong rounded-3xl p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-2 text-ink">
          <Sparkles className="h-5 w-5 text-brand" />
          <span className="brand-mark text-4xl">Linkea</span>
        </div>

        <h1 className="text-2xl">Inicia sesión</h1>
        <p className="mt-1 font-body text-sm text-muted">
          Accede a tu cuenta para ver tus recomendaciones y vacantes.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <FormRow label="Correo electrónico">
          <TextInput
            type="email"
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormRow>
        <FormRow label="Contraseña">
          <TextInput
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormRow>
        <Link to="/recuperar" className="-mt-2 w-fit font-body text-xs text-muted hover:text-brand">
          ¿Olvidaste tu contraseña?
        </Link>

        {error && <p className="rounded-xl bg-brand-soft p-3 font-body text-xs text-ink">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="group mt-2 flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 font-body text-sm font-semibold text-on-brand transition-all duration-300 hover:scale-[1.02] hover:opacity-90 active:scale-95 disabled:opacity-60"
        >
          {busy ? 'Entrando…' : 'Iniciar sesión'}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-brand hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </section>
  )
}
