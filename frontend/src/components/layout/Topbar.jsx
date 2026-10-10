import { Link, useNavigate } from 'react-router-dom'
import { Bell, Menu, Moon, Search, Sun, User } from 'lucide-react'
import useTheme from '../../hooks/useTheme'
import ProfileSelect from './ProfileSelect'

export default function Topbar({ onOpenMenu }) {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  function onSearch(event) {
    event.preventDefault()
    navigate('/vacantes')
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menú"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form onSubmit={onSearch} className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Buscar vacantes, estudiantes, empresas..."
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-4 font-body text-sm text-ink outline-none transition-shadow placeholder:text-muted focus:ring-2 focus:ring-brand/30"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <ProfileSelect />
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface"
        >
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
        <span
          title="Próximamente"
          className="relative hidden h-10 w-10 cursor-not-allowed items-center justify-center rounded-full text-ink sm:flex"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand" />
        </span>
        <Link
          to="/login"
          className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-4 font-body text-sm font-medium text-ink transition-colors hover:border-brand/40"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-on-brand">
            <User className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">Iniciar sesión</span>
        </Link>
      </div>
    </header>
  )
}
