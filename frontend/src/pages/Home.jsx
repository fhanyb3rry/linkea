import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  Building2,
  GraduationCap,
  MoreVertical,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react'
import {
  featuredVacancies,
  stats,
  suggestedCompanies,
  suggestedStudents,
  suggestedVacancies,
} from '../data/mock'

const statIcons = { users: Users, briefcase: Briefcase, building: Building2, graduation: GraduationCap }

const tabs = [
  { id: 'estudiantes', label: 'Estudiantes', data: suggestedStudents, action: 'Contactar' },
  { id: 'vacantes', label: 'Vacantes', data: suggestedVacancies, action: 'Postular' },
  { id: 'empresas', label: 'Empresas', data: suggestedCompanies, action: 'Ver perfil' },
]

const cardClass = 'rounded-2xl border border-line bg-surface'

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function Chip({ children }) {
  return (
    <span className="rounded-md border border-line bg-canvas px-2.5 py-1 font-body text-xs text-muted">
      {children}
    </span>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-night px-6 py-10 sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-salmon/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/3 h-72 w-72 rounded-full bg-salmon/15 blur-3xl" />

      <div className="relative max-w-xl">
        <p className="font-body text-xs font-medium uppercase tracking-[0.2em] text-white/70">
          Conecta · Postula · Crece
        </p>
        <h1 className="mt-4 text-4xl font-medium leading-[1.05] text-white sm:text-6xl">
          Convierte tu talento
          <br />
          en <em className="text-salmon">oportunidades.</em>
        </h1>
        <p className="mt-5 max-w-md font-body text-sm leading-relaxed text-white/75 sm:text-base">
          Linkea conecta estudiantes universitarios con empresas que ofrecen prácticas profesionales.
          La elegibilidad se decide con lógica proposicional y la compatibilidad con IA.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/vacantes/nueva"
            className="flex items-center gap-2 rounded-lg bg-brand px-5 py-3 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
          >
            Publicar vacante <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/vacantes"
            className="rounded-lg border border-white/25 px-5 py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Explorar vacantes
          </Link>
        </div>
      </div>

      <div className="relative mt-8 hidden max-w-xs rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md lg:absolute lg:bottom-8 lg:right-8 lg:mt-0 lg:block">
        <span className="block h-0.5 w-8 bg-salmon" />
        <p className="mt-4 font-heading text-xl leading-snug text-white">
          Las grandes carreras empiezan con buenas conexiones.
        </p>
      </div>
    </section>
  )
}

function StatsRow() {
  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {stats.map(({ icon, value, label }) => {
        const Icon = statIcons[icon]
        return (
          <div key={label} className={`${cardClass} flex items-center gap-4 p-5`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading text-2xl text-ink">{value}</p>
              <p className="font-body text-xs text-muted">{label}</p>
            </div>
          </div>
        )
      })}
      <Link
        to="/vacantes"
        className={`${cardClass} col-span-2 flex items-center gap-4 p-5 transition-colors hover:border-brand/40 lg:col-span-1`}
      >
        <Sparkles className="h-5 w-5 shrink-0 text-brand" />
        <div className="min-w-0">
          <p className="font-body text-sm font-semibold text-ink">Sigue explorando</p>
          <p className="font-body text-xs text-muted">Encuentra vacantes acordes a tu perfil.</p>
        </div>
        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-ink" />
      </Link>
    </section>
  )
}

function Suggestions() {
  const [active, setActive] = useState('estudiantes')
  const tab = tabs.find((t) => t.id === active)

  return (
    <section>
      <div className="flex items-end justify-between">
        <h2 className="text-2xl">Sugerencias para ti</h2>
        <Link
          to={active === 'estudiantes' ? '/estudiantes' : '/vacantes'}
          className="flex items-center gap-1 font-body text-sm text-ink hover:text-brand"
        >
          Ver más <ArrowRight className="h-4 w-4 text-brand" />
        </Link>
      </div>

      <div role="tablist" className="mt-4 flex gap-6 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={`-mb-px border-b-2 pb-3 font-body text-sm transition-colors ${
              t.id === active
                ? 'border-brand font-semibold text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tab.data.map((item) => (
          <article key={item.nombre} className={`${cardClass} flex flex-col gap-4 p-5`}>
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft font-body text-sm font-semibold text-brand">
                {initials(item.nombre)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm font-semibold text-ink">{item.nombre}</p>
                <p className="truncate font-body text-xs text-muted">{item.rol}</p>
              </div>
              <MoreVertical className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            </div>
            <div className="flex flex-wrap gap-2">
              {item.skills.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between">
              <button
                type="button"
                className="rounded-lg bg-brand px-4 py-2 font-body text-xs font-semibold text-on-brand transition-opacity hover:opacity-90"
              >
                {tab.action}
              </button>
              {item.match && (
                <span className="font-body text-xs font-semibold text-brand">{item.match}% match</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Featured() {
  return (
    <section>
      <div className="flex items-end justify-between">
        <h2 className="text-2xl">Vacantes destacadas</h2>
        <Link to="/vacantes" className="flex items-center gap-1 font-body text-sm text-ink hover:text-brand">
          Ver más <ArrowRight className="h-4 w-4 text-brand" />
        </Link>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {featuredVacancies.map((v) => (
          <article key={v.titulo} className={`${cardClass} overflow-hidden`}>
            <div className="relative h-24 bg-night">
              <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-salmon/50 blur-2xl" />
              <button
                type="button"
                aria-label="Guardar vacante"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur"
              >
                <Bookmark className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2 p-5">
              <h3 className="font-body text-sm font-semibold text-ink">{v.titulo}</h3>
              <p className="font-body text-xs font-medium text-brand">{v.empresa}</p>
              <p className="font-body text-xs leading-relaxed text-muted">{v.descripcion}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {v.tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>
            </div>
          </article>
        ))}

        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line p-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-brand">
            <Plus className="h-5 w-5" />
          </span>
          <p className="font-body text-sm font-semibold text-ink">¿Tienes una vacante?</p>
          <p className="font-body text-xs text-muted">Publícala y encuentra estudiantes elegibles.</p>
          <Link
            to="/vacantes/nueva"
            className="rounded-lg bg-brand px-4 py-2 font-body text-xs font-semibold text-on-brand transition-opacity hover:opacity-90"
          >
            Publicar vacante
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <Hero />
      <StatsRow />
      <Suggestions />
      <Featured />
    </div>
  )
}
