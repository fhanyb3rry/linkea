import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import PageTransition from './PageTransition'
import { Menu, Moon, Sun, X } from 'lucide-react'
import useTheme from '../../hooks/useTheme'

const links = [
  { href: '/#inicio', label: 'Inicio' },
  { href: '/#como-funciona', label: 'Sobre Linkea' },
  { href: '/#beneficios', label: 'Beneficios' },
  { href: '/#contacto', label: 'Contacto' },
]

export default function PublicLayout() {
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-canvas">
      <header className="absolute inset-x-0 top-0 z-30">
        <nav className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-5 sm:px-6">
          <Link to="/" className="font-heading text-3xl font-semibold text-ink">
            Linkea<span className="text-brand">✦</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                className={`border-b-2 pb-1 font-body text-sm font-medium text-ink transition-colors hover:text-brand ${
                  i === 0 ? 'border-brand text-brand' : 'border-transparent'
                }`}
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface"
            >
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <NavLink
              to="/login"
              className="hidden rounded-lg border border-line bg-surface px-5 py-2.5 font-body text-sm font-medium text-ink transition-colors hover:border-brand/40 sm:block"
            >
              Iniciar sesión
            </NavLink>
            <NavLink
              to="/registro"
              className="hidden rounded-lg bg-brand px-5 py-2.5 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 sm:block"
            >
              Registrarse
            </NavLink>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink md:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {open && (
          <div className="mx-4 flex flex-col gap-1 rounded-2xl border border-line bg-surface p-3 shadow-lg md:hidden">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2.5 font-body text-sm font-medium text-ink hover:bg-canvas"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2 border-t border-line pt-3">
              <Link to="/login" className="flex-1 rounded-lg border border-line px-4 py-2.5 text-center font-body text-sm font-medium text-ink">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-center font-body text-sm font-semibold text-on-brand">
                Registrarse
              </Link>
            </div>
          </div>
        )}
      </header>

      <div className={pathname === '/' ? '' : 'min-h-[70vh] pt-24'}>
        <PageTransition />
      </div>

      <footer id="contacto" className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-heading text-2xl text-ink">
              Linkea<span className="text-brand">✦</span>
            </p>
            <p className="mt-1 font-body text-sm text-muted">
              Conectamos estudiantes universitarios con prácticas profesionales.
            </p>
          </div>
          <p className="font-body text-sm text-muted">
            Contacto: <span className="text-ink">contacto@linkea.example</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
