import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Send } from 'lucide-react'
import { useAuth } from '../../context/auth'
import useActiveStudent from '../../hooks/useActiveStudent'
import useFetch from '../../hooks/useFetch'
import { createApplication, deleteApplication, getApplications } from '../../services/api'
import { RETIRABLES } from '../../lib/estados'
import { formatDate } from '../../lib/perfil'
import HistorialPostulacion from './HistorialPostulacion'
import EstadoBadge from './EstadoBadge'

// Postulación del estudiante con sesión a una vacante: enviar (con mensaje opcional), ver estado o retirar.
export default function ApplyButton({ vacancyId }) {
  const { usuario } = useAuth()
  const [studentId] = useActiveStudent()
  const [mensaje, setMensaje] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const { data, loading, reload } = useFetch(
    () => getApplications({ studentId, vacancyId }),
    [studentId, vacancyId],
    Boolean(studentId),
  )
  const application = data?.[0]

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Solo los estudiantes se postulan.
  if (usuario?.rol !== 'estudiante') return null

  if (!studentId) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-line p-4 text-center">
        <p className="font-body text-sm text-muted">
          Crea tu perfil para postularte.{' '}
          <Link to="/perfil/crear" className="font-semibold text-brand hover:underline">
            Crear mi perfil
          </Link>
        </p>
      </div>
    )
  }

  if (loading) return <div className="mt-10 h-24 animate-pulse rounded-xl bg-canvas" aria-busy="true" />

  if (application) {
    return (
      <div className="mt-10 rounded-xl border border-line bg-canvas p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal text-white">
            <Check className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-body text-sm font-semibold text-ink">Ya te postulaste a esta vacante</p>
            <p className="font-body text-xs text-muted">Enviada el {formatDate(application.creada_en)}</p>
          </div>
          <EstadoBadge estado={application.estado} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/postulaciones"
            className="rounded-lg bg-cocoa px-4 py-2 font-body text-xs font-semibold text-on-cocoa hover:opacity-90"
          >
            Ver mis postulaciones
          </Link>
          {RETIRABLES.includes(application.estado) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => deleteApplication(application.id))}
              className="rounded-lg border border-line bg-surface px-4 py-2 font-body text-xs font-semibold text-ink hover:border-cocoa/50 disabled:opacity-60"
            >
              Retirar postulación
            </button>
          )}
        </div>
        <div className="mt-4">
          <HistorialPostulacion historial={application.historial} />
        </div>
        {error && <p className="mt-3 font-body text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mt-10">
      <label htmlFor="mensaje" className="mb-1.5 block font-body text-xs font-medium text-ink">
        Mensaje para la empresa (opcional)
      </label>
      <textarea
        id="mensaje"
        rows={3}
        maxLength={500}
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        placeholder="Cuéntales por qué te interesa esta práctica."
        className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 font-body text-sm text-ink outline-none placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => createApplication(studentId, vacancyId, mensaje.trim()))}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3.5 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {busy ? 'Enviando…' : 'Postular a esta vacante'}
      </button>
      {error && <p className="mt-3 font-body text-xs text-red-600">{error}</p>}
    </div>
  )
}
