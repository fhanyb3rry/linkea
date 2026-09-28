import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowRight, Menu, Search, Sparkles, X } from 'lucide-react'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/vacantes', label: 'Explorar' },
  { to: '/estudiantes', label: 'Para estudiantes' },
  { to: '/para-empresas', label: 'Para empresas' },
  { to: '/recursos', label: 'Recursos' },
]

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `relative font-body text-sm font-medium transition-colors hover:text-cafe-avellana ${
          isActive ? 'text-cafe-avellana' : 'text-azul-marino'
        }`
      }
    >
      {({ isActive }) => (
        <span className="flex flex-col items-center gap-1.5 sm:flex-row">
          {label}
          {isActive && <span className="h-1 w-1 rounded-full bg-cafe-avellana sm:hidden" />}
        </span>
      )}
    </NavLink>
  )
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-azul-marino/10 bg-blanco/80 shadow-sm backdrop-blur-md'
          : 'border-transparent bg-blanco'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="/" className="group flex items-center gap-2 font-heading text-xl font-semibold text-azul-marino">
          <Sparkles className="h-5 w-5 text-cafe-avellana transition-transform duration-500 group-hover:rotate-45" />
          Linkea
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <NavItem key={link.to} {...link} />
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            aria-label="Buscar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-azul-marino transition-all duration-200 hover:scale-110 hover:bg-beige-almendra"
          >
            <Search className="h-4 w-4" />
          </button>
          <NavLink
            to="/login"
            className="rounded-full border border-azul-marino/20 px-4 py-2 font-body text-sm font-medium text-azul-marino transition-all duration-200 hover:scale-[1.03] hover:bg-beige-almendra active:scale-95"
          >
            Iniciar sesión
          </NavLink>
          <NavLink
            to="/registro"
            className="group flex items-center gap-1.5 rounded-full bg-cafe-avellana px-4 py-2 font-body text-sm font-medium text-blanco transition-all duration-200 hover:scale-[1.03] hover:opacity-90 active:scale-95"
          >
            Registrarse
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </NavLink>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center text-azul-marino md:hidden"
          aria-label="Abrir menú"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {isOpen && (
        <div className="flex flex-col gap-4 border-t border-azul-marino/10 px-4 pb-5 pt-3 md:hidden">
          {links.map((link) => (
            <NavItem key={link.to} {...link} onClick={() => setIsOpen(false)} />
          ))}
          <div className="mt-2 flex flex-col gap-2">
            <NavLink
              to="/login"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-azul-marino/20 px-4 py-2 text-center font-body text-sm font-medium text-azul-marino"
            >
              Iniciar sesión
            </NavLink>
            <NavLink
              to="/registro"
              onClick={() => setIsOpen(false)}
              className="rounded-full bg-cafe-avellana px-4 py-2 text-center font-body text-sm font-medium text-blanco"
            >
              Registrarse →
            </NavLink>
          </div>
        </div>
      )}
    </header>
  )
}
