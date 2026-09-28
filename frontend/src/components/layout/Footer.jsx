import { Sparkles } from 'lucide-react'

const columns = [
  {
    title: 'Para estudiantes',
    links: ['Explorar vacantes', 'Cómo funciona', 'Match con IA'],
  },
  {
    title: 'Para empresas',
    links: ['Publicar vacante', 'Buscar talento', 'Planes'],
  },
  {
    title: 'Recursos',
    links: ['Blog', 'Guías de práctica', 'Soporte'],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-azul-marino/10 bg-azul-marino">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <a href="/" className="flex items-center gap-2 font-heading text-xl font-semibold text-blanco">
            <Sparkles className="h-5 w-5 text-cafe-avellana" />
            Linkea
          </a>
          <p className="mt-3 max-w-xs font-body text-sm text-blanco/60">
            Conectamos estudiantes universitarios con empresas para prácticas profesionales que
            impulsan el futuro.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="font-body text-sm font-semibold text-blanco">{column.title}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="font-body text-sm text-blanco/60 transition-colors hover:text-cafe-avellana"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-blanco/10 px-4 py-5 sm:px-6">
        <p className="mx-auto max-w-7xl font-body text-xs text-blanco/50">
          © {new Date().getFullYear()} Linkea. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
