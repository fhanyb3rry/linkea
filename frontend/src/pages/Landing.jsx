import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Brain,
  Briefcase,
  ListChecks,
  Plus,
  Search,
  Send,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { stats } from '../data/mock'

const benefits = [
  { icon: Users, title: 'Conecta', text: 'Encuentra empresas afines a tu carrera y habilidades.' },
  { icon: ListChecks, title: 'Elegibilidad', text: 'Reglas claras y auditables dicen si cumples los requisitos.' },
  { icon: Brain, title: 'Compatibilidad', text: 'La IA analiza qué tan bien encajas con cada vacante.' },
  { icon: TrendingUp, title: 'Crece', text: 'Gana experiencia real y construye tu trayectoria profesional.' },
]

const steps = [
  { n: '01', icon: UserPlus, title: 'Crea tu perfil', text: 'Cuéntanos tu carrera, tus habilidades, tu disponibilidad y tu zona.' },
  { n: '02', icon: Search, title: 'Descubre vacantes', text: 'Linkea filtra las vacantes para las que eres elegible, con lógica proposicional.' },
  { n: '03', icon: Send, title: 'Postula con tu match', text: 'La IA calcula tu compatibilidad y te explica por qué encajas.' },
]

const floatCard = 'absolute rounded-2xl border border-line bg-surface/95 shadow-xl backdrop-blur'

function HeroVisual() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-xl lg:h-[480px]">
      <div className="absolute inset-x-4 bottom-4 top-16 rounded-3xl bg-gradient-to-br from-brand/25 via-brand-soft to-transparent" />

      {/* Ventana de la app */}
      <div className="absolute inset-x-8 top-20 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl sm:inset-x-12">
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-brand" />
          <span className="h-2 w-2 rounded-full bg-line" />
          <span className="h-2 w-2 rounded-full bg-line" />
        </div>
        <div className="flex gap-3 p-3">
          <div className="hidden w-20 shrink-0 flex-col gap-2 sm:flex">
            <span className="h-2 w-12 rounded bg-brand" />
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-2 rounded bg-line" />
            ))}
          </div>
          <div className="flex-1 space-y-3">
            <p className="font-heading text-sm text-ink">¡Hola, Stephy!</p>
            <div className="grid grid-cols-3 gap-2">
              {[12, 4, 3].map((v) => (
                <div key={v} className="rounded-lg border border-line p-2">
                  <p className="font-heading text-sm text-ink">{v}</p>
                  <span className="mt-1 block h-1.5 w-8 rounded bg-line" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['Desarrollo', 'Datos', 'Diseño'].map((t) => (
                <div key={t} className="rounded-lg border border-line p-2">
                  <span className="block h-8 rounded bg-brand-soft" />
                  <p className="mt-1.5 text-[10px] text-muted">{t}</p>
                  <span className="mt-1 block h-1.5 w-10 rounded bg-brand" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas flotantes */}
      <div className={`${floatCard} left-0 top-0 w-52 p-4 sm:left-2`}>
        <div className="flex items-center">
          {['AT', 'CR', 'VG'].map((i, idx) => (
            <span
              key={i}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-brand-soft font-body text-xs font-semibold text-brand ${idx ? '-ml-2' : ''}`}
            >
              {i}
            </span>
          ))}
          <span className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-brand text-on-brand">
            <Plus className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 font-body text-xs leading-snug text-muted">
          Conecta con empresas que buscan tu perfil.
        </p>
      </div>

      <div className={`${floatCard} right-0 top-10 w-44 p-4`}>
        <p className="font-body text-xs font-semibold text-ink">Compatibilidad</p>
        <div className="mt-3 flex h-14 items-end gap-1.5">
          {[30, 45, 38, 60, 52, 90].map((h, i) => (
            <span key={i} className="flex-1 rounded-sm bg-brand" style={{ height: `${h}%`, opacity: 0.35 + i * 0.13 }} />
          ))}
        </div>
        <p className="mt-2 font-body text-xs font-semibold text-ink">
          +12% <span className="text-brand">↗</span>
        </p>
        <p className="font-body text-[11px] text-muted">Match promedio este mes</p>
      </div>

      <div className={`${floatCard} bottom-0 left-4 flex w-60 items-start gap-3 p-4 sm:left-0`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Briefcase className="h-5 w-5" />
        </span>
        <div>
          <p className="font-body text-xs font-semibold text-ink">Vacantes reales</p>
          <p className="mt-0.5 font-body text-[11px] leading-snug text-muted">
            Prácticas verificadas de empresas de tu zona.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <main>
      <section id="inicio" className="relative overflow-hidden pt-28 lg:pt-32">
        <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="font-body text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Conecta · Postula · Crece
            </p>
            <h1 className="mt-5 text-5xl font-medium leading-[1.05] sm:text-6xl">
              Convierte tu talento
              <br />
              en <em className="text-brand">oportunidades</em>
            </h1>
            <p className="mt-6 max-w-lg font-body text-base leading-relaxed text-muted">
              Linkea conecta estudiantes universitarios con empresas que ofrecen prácticas profesionales.
              Decide con reglas claras si eres elegible y con IA qué tan compatible eres.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/registro"
                className="flex items-center gap-2 rounded-lg bg-brand px-6 py-3.5 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
              >
                Comenzar ahora <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#como-funciona"
                className="rounded-lg border border-line bg-surface px-6 py-3.5 font-body text-sm font-semibold text-ink transition-colors hover:border-brand/40"
              >
                Conocer más
              </a>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-0">
              {stats.map(({ value, label }, i) => (
                <div key={label} className={`sm:px-4 ${i ? 'sm:border-l sm:border-line' : 'sm:pl-0'}`}>
                  <dt className="font-heading text-2xl text-ink">{value}</dt>
                  <dd className="font-body text-xs text-muted">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroVisual />
        </div>
      </section>

      <section id="beneficios" className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg">{title}</h3>
                <p className="mt-1 font-body text-sm leading-relaxed text-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_2fr]">
        <div>
          <p className="font-body text-xs font-medium uppercase tracking-[0.2em] text-brand">¿Cómo funciona?</p>
          <h2 className="mt-3 text-4xl font-medium leading-tight">
            De tu perfil
            <br />a una <em className="text-brand">gran práctica.</em>
          </h2>
          <p className="mt-4 max-w-sm font-body text-sm leading-relaxed text-muted">
            Te acompañamos en cada paso para convertir tu formación en una experiencia profesional real.
          </p>
          <Link
            to="/registro"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-5 py-3 font-body text-sm font-semibold text-ink transition-colors hover:border-brand/40"
          >
            Crear mi perfil <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map(({ n, icon: Icon, title, text }) => (
            <li key={n} className="relative rounded-2xl border border-line bg-surface p-6 text-center">
              <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft font-body text-xs font-semibold text-brand">
                {n}
              </span>
              <span className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-lg">{title}</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
