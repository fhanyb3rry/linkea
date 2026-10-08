import { Link, NavLink } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Bookmark,
  Briefcase,
  GraduationCap,
  Home,
  MessageCircle,
  Send,
  X,
} from 'lucide-react'

// `to` = ruta real. Sin `to` = pantalla de diseño todavía sin función.
const items = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/vacantes', label: 'Vacantes', icon: Briefcase },
  { to: '/estudiantes', label: 'Estudiantes', icon: GraduationCap },
  { label: 'Postulaciones', icon: Send },
  { label: 'Mensajes', icon: MessageCircle },
  { label: 'Notificaciones', icon: Bell },
  { label: 'Guardados', icon: Bookmark },
]

const base = 'flex items-center gap-3 rounded-xl px-4 py-2.5 font-body text-sm font-medium transition-colors'

function Item({ to, label, icon: Icon, end, onNavigate }) {
  if (!to) {
    return (
      <span
        title="Próximamente"
        className={`${base} cursor-not-allowed text-muted/70`}
      >
        <Icon className="h-[18px] w-[18px]" />
        {label}
        <span className="ml-auto rounded-full bg-canvas px-2 py-0.5 text-[10px] uppercase tracking-wide">
          Pronto
        </span>
      </span>
    )
  }
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${base} ${isActive ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-canvas'}`
      }
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </NavLink>
  )
}

export default function Sidebar({ onNavigate, onClose }) {
  return (
    <div className="flex h-full flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between px-2">
        <Link to="/" onClick={onNavigate} className="font-heading text-3xl font-semibold text-ink">
          Linkea<span className="text-brand">✦</span>
        </Link>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Cerrar menú" className="text-muted lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <Item key={item.label} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="relative mt-auto overflow-hidden rounded-2xl bg-night p-5 text-on-brand">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/50 blur-3xl" />
        <p className="relative font-heading text-xl leading-snug text-on-brand">
          Conecta con oportunidades que impulsan tu futuro.
        </p>
        <span className="relative mt-3 block h-0.5 w-8 bg-brand" />
        <Link
          to="/vacantes"
          onClick={onNavigate}
          className="relative mt-5 flex items-center justify-between rounded-lg border border-white/20 px-3 py-2 font-body text-sm text-on-brand transition-colors hover:bg-white/10"
        >
          Explorar vacantes
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
