import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import {
  ArrowRight,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  GraduationCap,
  Home,
  Network,
  MessageCircle,
  Send,
  Settings,
  UserRound,
  X,
} from 'lucide-react'

const groups = [
  {
    title: 'Explorar',
    items: [
      { to: '/inicio', label: 'Inicio', icon: Home },
      { to: '/vacantes', label: 'Vacantes', icon: Briefcase },
      { to: '/estudiantes', label: 'Estudiantes', icon: GraduationCap },
      { to: '/guardados', label: 'Guardados', icon: Bookmark },
      { to: '/rutas', label: 'Rutas de aprendizaje', icon: Network, roles: ['estudiante'] },
    ],
  },
  {
    title: 'Mi actividad',
    items: [
      { to: '/postulaciones', label: 'Postulaciones', icon: Send, roles: ['estudiante'] },
      { to: '/mensajes', label: 'Mensajes', icon: MessageCircle },
      { to: '/notificaciones', label: 'Notificaciones', icon: Bell },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { to: '/perfil', label: 'Mi perfil', icon: UserRound, roles: ['estudiante'] },
      { to: '/empresa', label: 'Mi empresa', icon: Building2, roles: ['empresa'] },
      { to: '/configuracion', label: 'Configuración', icon: Settings },
    ],
  },
]

const base = 'flex items-center gap-3 rounded-xl px-4 py-2 font-body text-sm font-medium transition-colors'

function Item({ to, label, icon: Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => `${base} ${isActive ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-canvas'}`}
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </NavLink>
  )
}

export default function Sidebar({ onNavigate, onClose }) {
  const { usuario } = useAuth()
  // Cada rol ve solo las opciones que le tocan (los items sin `roles` son para todos).
  const visibles = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(usuario?.rol)) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="flex h-full flex-col gap-5 px-4 py-6">
      <div className="flex items-center justify-between px-2">
        <Link to="/inicio" onClick={onNavigate} className="font-heading text-3xl font-semibold text-ink">
          Linkea<span className="text-brand">✦</span>
        </Link>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Cerrar menú" className="text-muted lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1" aria-label="Principal">
        {visibles.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            <p className="px-4 pb-1 font-body text-[10px] font-semibold uppercase tracking-[0.15em] text-muted/80">
              {group.title}
            </p>
            {group.items.map((item) => (
              <Item key={item.to} {...item} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="relative shrink-0 overflow-hidden rounded-2xl bg-night p-5 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-salmon/35 blur-3xl" />
        <p className="relative font-heading text-lg leading-snug text-white">
          Conecta con oportunidades que impulsan tu futuro.
        </p>
        <span className="relative mt-3 block h-0.5 w-8 bg-salmon" />
        <Link
          to="/vacantes"
          onClick={onNavigate}
          className="relative mt-4 flex items-center justify-between rounded-lg border border-white/20 px-3 py-2 font-body text-sm text-white transition-colors hover:bg-white/10"
        >
          Explorar vacantes
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
