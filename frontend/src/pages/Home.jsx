import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  Building2,
  Check,
  GraduationCap,
  MoreVertical,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react'
import CountUp from '../components/home/CountUp'
import Reveal from '../components/home/Reveal'
import useInView from '../hooks/useInView'
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
const liftClass =
  'transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/10'

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

// Chip de cristal flotando sobre el hero
function FloatChip({ className = '', delay = 0, children }) {
  return (
    <div
      className={`animate-float absolute hidden items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white shadow-xl backdrop-blur-md xl:flex ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  )
}

function Hero() {
  return (
    <section className="animate-fade-in-up relative overflow-hidden rounded-3xl border border-line bg-night px-6 py-10 sm:px-10 sm:py-14">
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_right,transparent,black_70%)]" />
      <div className="animate-blob pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-salmon/40 blur-3xl" />
      <div className="animate-blob pointer-events-none absolute -bottom-32 right-1/3 h-72 w-72 rounded-full bg-salmon/15 blur-3xl [animation-delay:-4s]" />

      <div className="relative max-w-xl">
        <p className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-body text-xs font-medium uppercase tracking-[0.2em] text-white/80 [animation-delay:100ms]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-salmon opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-salmon" />
          </span>
          Conecta · Postula · Crece
        </p>
        <h1 className="animate-fade-in-up mt-5 text-4xl font-medium leading-[1.05] text-white [animation-delay:200ms] sm:text-6xl">
          Convierte tu talento
          <br />
          en <em className="text-shimmer">oportunidades.</em>
        </h1>
        <p className="animate-fade-in-up mt-5 max-w-md font-body text-sm leading-relaxed text-white/75 [animation-delay:300ms] sm:text-base">
          Linkea conecta estudiantes universitarios con empresas que ofrecen prácticas profesionales.
          La elegibilidad se decide con lógica proposicional y la compatibilidad con IA.
        </p>
        <div className="animate-fade-in-up mt-7 flex flex-wrap gap-3 [animation-delay:400ms]">
          <Link
            to="/vacantes/nueva"
            className="btn-sheen group flex items-center gap-2 rounded-lg bg-brand px-5 py-3 font-body text-sm font-semibold text-on-brand transition-transform duration-200 hover:scale-[1.03] active:scale-95"
          >
            Publicar vacante
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link
            to="/vacantes"
            className="rounded-lg border border-white/25 px-5 py-3 font-body text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:scale-[1.03] hover:bg-white/10 active:scale-95"
          >
            Explorar vacantes
          </Link>
        </div>
      </div>

      <FloatChip className="right-[30%] top-8" delay={0}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-salmon text-night">
          <Check className="h-4 w-4" />
        </span>
        <div>
          <p className="font-body text-xs font-semibold">Eres elegible</p>
          <p className="font-body text-[11px] text-white/70">92% de compatibilidad</p>
        </div>
      </FloatChip>

      <FloatChip className="right-8 top-24" delay={1.2}>
        <div className="flex">
          {['AT', 'CR', 'VG'].map((i, idx) => (
            <span
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-night bg-salmon/80 font-body text-[10px] font-bold text-night ${idx ? '-ml-2' : ''}`}
            >
              {i}
            </span>
          ))}
        </div>
        <p className="font-body text-[11px] text-white/80">+12 vacantes nuevas</p>
      </FloatChip>

      <div className="animate-float relative mt-8 hidden max-w-xs rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md [animation-delay:2s] lg:absolute lg:bottom-8 lg:right-8 lg:mt-0 lg:block">
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
      {stats.map(({ icon, value, label }, i) => {
        const Icon = statIcons[icon]
        return (
          <Reveal key={label} delay={i * 90}>
            <div className={`${cardClass} ${liftClass} group flex h-full items-center gap-4 p-5`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-heading text-2xl text-ink">
                  <CountUp value={value} />
                </p>
                <p className="font-body text-xs text-muted">{label}</p>
              </div>
            </div>
          </Reveal>
        )
      })}
      <Reveal delay={stats.length * 90} className="col-span-2 lg:col-span-1">
        <Link
          to="/vacantes"
          className={`${cardClass} ${liftClass} group flex h-full items-center gap-4 p-5`}
        >
          <Sparkles className="h-5 w-5 shrink-0 text-brand transition-transform duration-500 group-hover:rotate-180" />
          <div className="min-w-0">
            <p className="font-body text-sm font-semibold text-ink">Sigue explorando</p>
            <p className="font-body text-xs text-muted">Encuentra vacantes acordes a tu perfil.</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-ink transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </Reveal>
    </section>
  )
}

// Barra de match que se llena al entrar en pantalla
function MatchBar({ value }) {
  const [ref, visible] = useInView({ threshold: 0.5 })
  return (
    <div ref={ref} className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div
        className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-out"
        style={{ width: visible ? `${value}%` : '0%' }}
      />
    </div>
  )
}

function Suggestions() {
  const [active, setActive] = useState('estudiantes')
  const tab = tabs.find((t) => t.id === active)

  return (
    <Reveal>
      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">Sugerencias para ti</h2>
          <Link
            to={active === 'estudiantes' ? '/estudiantes' : '/vacantes'}
            className="group flex items-center gap-1 font-body text-sm text-ink hover:text-brand"
          >
            Ver más
            <ArrowRight className="h-4 w-4 text-brand transition-transform duration-300 group-hover:translate-x-1" />
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
              className={`relative pb-3 font-body text-sm transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-center after:bg-brand after:transition-transform after:duration-300 ${
                t.id === active
                  ? 'font-semibold text-ink after:scale-x-100'
                  : 'text-muted after:scale-x-0 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* key: al cambiar de pestaña se vuelve a montar y las tarjetas entran en cascada */}
        <div key={active} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tab.data.map((item, i) => (
            <article
              key={item.nombre}
              className={`${cardClass} ${liftClass} animate-fade-in-up flex flex-col gap-4 p-5`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
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
              {item.match && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between font-body text-xs">
                    <span className="text-muted">Compatibilidad</span>
                    <span className="font-semibold text-brand">{item.match}%</span>
                  </div>
                  <MatchBar value={item.match} />
                </div>
              )}
              <button
                type="button"
                className="mt-auto self-start rounded-lg bg-brand px-4 py-2 font-body text-xs font-semibold text-on-brand transition-[transform,opacity] duration-200 hover:scale-105 hover:opacity-90 active:scale-95"
              >
                {tab.action}
              </button>
            </article>
          ))}
        </div>
      </section>
    </Reveal>
  )
}

function FeaturedCard({ vacancy, saved, onToggle }) {
  return (
    <article className={`${cardClass} ${liftClass} group overflow-hidden`}>
      <div className="relative h-24 overflow-hidden bg-night">
        <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-salmon/50 blur-2xl transition-transform duration-700 group-hover:-translate-x-10 group-hover:translate-y-6 group-hover:scale-150" />
        <button
          type="button"
          aria-label={saved ? 'Quitar de guardados' : 'Guardar vacante'}
          aria-pressed={saved}
          onClick={onToggle}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
        >
          <Bookmark
            key={String(saved)}
            className={`h-4 w-4 ${saved ? 'animate-pop fill-current text-salmon' : ''}`}
          />
        </button>
      </div>
      <div className="flex flex-col gap-2 p-5">
        <h3 className="font-body text-sm font-semibold text-ink">{vacancy.titulo}</h3>
        <p className="font-body text-xs font-medium text-brand">{vacancy.empresa}</p>
        <p className="font-body text-xs leading-relaxed text-muted">{vacancy.descripcion}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {vacancy.tags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      </div>
    </article>
  )
}

function Featured() {
  const [saved, setSaved] = useState(() => new Set())

  function toggle(titulo) {
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(titulo)) next.delete(titulo)
      else next.add(titulo)
      return next
    })
  }

  return (
    <section>
      <Reveal>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">Vacantes destacadas</h2>
          <Link to="/vacantes" className="group flex items-center gap-1 font-body text-sm text-ink hover:text-brand">
            Ver más
            <ArrowRight className="h-4 w-4 text-brand transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </Reveal>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {featuredVacancies.map((v, i) => (
          <Reveal key={v.titulo} delay={i * 100}>
            <FeaturedCard vacancy={v} saved={saved.has(v.titulo)} onToggle={() => toggle(v.titulo)} />
          </Reveal>
        ))}

        <Reveal delay={featuredVacancies.length * 100}>
          <div className="group flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line p-6 text-center transition-colors duration-300 hover:border-brand hover:bg-brand-soft/40">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-brand transition-transform duration-500 group-hover:rotate-90">
              <Plus className="h-5 w-5" />
            </span>
            <p className="font-body text-sm font-semibold text-ink">¿Tienes una vacante?</p>
            <p className="font-body text-xs text-muted">Publícala y encuentra estudiantes elegibles.</p>
            <Link
              to="/vacantes/nueva"
              className="btn-sheen rounded-lg bg-brand px-4 py-2 font-body text-xs font-semibold text-on-brand transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              Publicar vacante
            </Link>
          </div>
        </Reveal>
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
