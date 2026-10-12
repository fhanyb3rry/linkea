import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import PageTitle from '../components/layout/PageTitle'
import PreviewNotice from '../components/layout/PreviewNotice'
import { useAuth } from '../context/auth'
import useActiveStudent from '../hooks/useActiveStudent'
import useFetch from '../hooks/useFetch'
import useTheme from '../hooks/useTheme'
import { ROLES } from '../lib/roles'
import { deleteStudent, getStudent } from '../services/api'

const KEY = 'linkea-settings'
const DEFAULTS = {
  emailMatches: true,
  emailPostulaciones: true,
  resumenSemanal: false,
  perfilVisible: true,
  mostrarContacto: true,
}

function readSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

function Switch({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 py-3">
      <span>
        <span className="block font-body text-sm font-medium text-ink">{label}</span>
        {description && <span className="block font-body text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-cocoa' : 'bg-line'}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </label>
  )
}

function Block({ title, description, children }) {
  return (
    <section className="panel p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      {description && <p className="mt-1 font-body text-xs text-muted">{description}</p>}
      <div className="mt-3 divide-y divide-line">{children}</div>
    </section>
  )
}

export default function Configuracion() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { usuario, logout, refresh } = useAuth()
  const [studentId] = useActiveStudent()
  const [settings, setSettings] = useState(readSettings)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState(null)
  const { data: student } = useFetch(() => getStudent(studentId), [studentId], Boolean(studentId))

  function update(key, value) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // sin almacenamiento: el ajuste dura solo la sesión
      }
      return next
    })
  }

  function cerrarSesion() {
    logout()
    navigate('/login')
  }

  async function eliminarPerfil() {
    setError(null)
    try {
      await deleteStudent(studentId)
      await refresh()
      navigate('/inicio')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle title="Configuración" subtitle="Personaliza tu experiencia en Linkea." />

      <Block title="Apariencia">
        <div className="flex items-center justify-between gap-6 py-3">
          <span>
            <span className="block font-body text-sm font-medium text-ink">Tema</span>
            <span className="block font-body text-xs text-muted">Actualmente: {theme === 'dark' ? 'oscuro' : 'claro'}</span>
          </span>
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 font-body text-xs font-semibold text-ink hover:border-cocoa/50"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Cambiar a {theme === 'dark' ? 'claro' : 'oscuro'}
          </button>
        </div>
      </Block>

      <Block title="Cuenta">
        <div className="py-3">
          <span className="block font-body text-sm font-medium text-ink">{usuario.nombre}</span>
          <span className="block font-body text-xs text-muted">
            {usuario.email} · {ROLES[usuario.rol]}
          </span>
        </div>
        {usuario.rol === 'estudiante' && (
          <div className="flex flex-wrap items-center justify-between gap-4 py-3">
            <span>
              <span className="block font-body text-sm font-medium text-ink">Mi perfil</span>
              <span className="block font-body text-xs text-muted">
                {studentId ? (student ? `${student.nombre} · ${student.carrera}` : 'Cargando…') : 'Aún no lo creas'}
              </span>
            </span>
            {studentId ? (
              <Link
                to="/perfil/editar"
                className="rounded-lg border border-line bg-surface px-4 py-2 font-body text-xs font-semibold text-ink hover:border-cocoa/50"
              >
                Editar perfil
              </Link>
            ) : (
              <Link
                to="/perfil/crear"
                className="rounded-lg bg-brand px-4 py-2 font-body text-xs font-semibold text-on-brand hover:opacity-90"
              >
                Crear perfil
              </Link>
          )}
        </div>
        )}
      </Block>

      <Block title="Notificaciones" description="Elige qué avisos quieres recibir.">
        <Switch
          checked={settings.emailMatches}
          onChange={(v) => update('emailMatches', v)}
          label="Nuevas vacantes compatibles"
          description="Cuando haya una práctica elegible para ti."
        />
        <Switch
          checked={settings.emailPostulaciones}
          onChange={(v) => update('emailPostulaciones', v)}
          label="Cambios en mis postulaciones"
          description="Cuando una empresa actualice el estado."
        />
        <Switch
          checked={settings.resumenSemanal}
          onChange={(v) => update('resumenSemanal', v)}
          label="Resumen semanal"
          description="Un correo con lo más relevante de la semana."
        />
      </Block>

      <Block title="Privacidad">
        <Switch
          checked={settings.perfilVisible}
          onChange={(v) => update('perfilVisible', v)}
          label="Perfil visible para empresas"
          description="Si lo desactivas, no aparecerás en los candidatos sugeridos."
        />
        <Switch
          checked={settings.mostrarContacto}
          onChange={(v) => update('mostrarContacto', v)}
          label="Mostrar correo y teléfono"
        />
      </Block>

      <PreviewNotice>
        Estos ajustes se guardan solo en este navegador y todavía no cambian el comportamiento del sistema.
      </PreviewNotice>

      <Block title="Zona de riesgo">
        <div className="flex flex-wrap items-center justify-between gap-4 py-3">
          <span>
            <span className="block font-body text-sm font-medium text-ink">Cerrar sesión</span>
            <span className="block font-body text-xs text-muted">Sal de tu cuenta en este navegador.</span>
          </span>
          <button
            type="button"
            onClick={cerrarSesion}
            className="rounded-lg border border-line bg-surface px-4 py-2 font-body text-xs font-semibold text-ink hover:border-cocoa/50"
          >
            Cerrar sesión
          </button>
        </div>

        {studentId && (
          <div className="flex flex-wrap items-center justify-between gap-4 py-3">
            <span>
              <span className="block font-body text-sm font-medium text-ink">Eliminar mi perfil</span>
              <span className="block font-body text-xs text-muted">
                Borra tu perfil, tu currículum y tus postulaciones. No se puede deshacer.
              </span>
            </span>
            {confirmDelete ? (
              <span className="flex items-center gap-2 font-body text-xs">
                ¿Seguro?
                <button type="button" onClick={eliminarPerfil} className="rounded-lg bg-brand px-3 py-2 font-semibold text-on-brand">
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-line px-3 py-2 font-semibold text-ink"
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg border border-brand/40 px-4 py-2 font-body text-xs font-semibold text-brand hover:bg-brand-soft"
              >
                Eliminar perfil
              </button>
            )}
          </div>
        )}
        {error && <p className="py-3 font-body text-xs text-red-600">{error}</p>}
      </Block>
    </section>
  )
}
