import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  GraduationCap,
  LayoutGrid,
  MoreVertical,
  Plus,
  SearchX,
  Sparkles,
  Users,
} from 'lucide-react'
import CountUp from '../components/home/CountUp'
import Reveal from '../components/home/Reveal'
import useInView from '../hooks/useInView'
import VacancyCard from '../components/cards/VacancyCard'
import AreaFilter from '../components/home/AreaFilter'
import useStoredSet from '../hooks/useStoredSet'
import { AREAS, OTROS, areaOf, countByArea } from '../lib/areas'
import { getStudents, getVacancies } from '../services/api'
import {
  featuredVacancies,
  stats,
  suggestedCompanies,
  suggestedStudents,
  suggestedVacancies,
} from '../data/mock'

const statIcons = { users: Users, briefcase: Briefcase, building: Building2, graduation: GraduationCap }

const tabs = [
  { id: 'estudiantes', label: 'Estudiantes' },
  { id: 'vacantes', label: 'Vacantes' },
  { id: 'empresas', label: 'Empresas' },
]

const cardClass = 'card'

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
            <div className={`${cardClass} group flex h-full items-center gap-4 p-5`}>
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
          className={`${cardClass} group flex h-full items-center gap-4 p-5`}
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


// Datos del panel: reales desde la API; si no hay (backend apagado o vacío), se usan los de ejemplo.
function useHomeData() {
  const [data, setData] = useState({ students: [], vacancies: [], ready: false })

  useEffect(() => {
    Promise.allSettled([getStudents(), getVacancies()]).then(([s, v]) =>
      setData({ students: s.value ?? [], vacancies: v.value ?? [], ready: true }),
    )
  }, [])

  return useMemo(() => {
    const { students, vacancies } = data
    const empresas = [...new Map(vacancies.map((v) => [v.nombre_empresa, v])).values()]

    const sugerencias = {
      estudiantes: students.slice(0, 4).map((s) => ({
        id: s.id,
        nombre: s.nombre,
        rol: `${s.carrera} · ${s.semestre}º semestre`,
        skills: s.skills.slice(0, 3),
      })),
      vacantes: vacancies.slice(0, 4).map((v) => ({
        id: v.id,
        nombre: v.nombre_empresa,
        rol: v.sector,
        skills: v.requisitos.skills_clave.slice(0, 3),
      })),
      empresas: empresas.slice(0, 4).map((v) => ({
        nombre: v.nombre_empresa,
        rol: v.sector,
        skills: [v.ubicacion.zona],
      })),
    }

    const destacadas = vacancies

    const fallback = {
      estudiantes: sugerencias.estudiantes.length === 0,
      vacantes: sugerencias.vacantes.length === 0,
      empresas: sugerencias.empresas.length === 0,
      destacadas: destacadas.length === 0,
    }

    return {
      sugerencias: {
        estudiantes: fallback.estudiantes ? suggestedStudents : sugerencias.estudiantes,
        vacantes: fallback.vacantes ? suggestedVacancies : sugerencias.vacantes,
        empresas: fallback.empresas ? suggestedCompanies : sugerencias.empresas,
      },
      destacadas: fallback.destacadas ? featuredVacancies : destacadas,
      fallback,
    }
  }, [data])
}

const actionClass =
  'mt-auto flex items-center gap-1.5 self-start rounded-lg px-4 py-2 font-body text-xs font-semibold transition-[transform,opacity,background-color] duration-200 hover:scale-105 active:scale-95'

function CardAction({ tab, item, connected, onConnect }) {
  if (tab === 'estudiantes') {
    return (
      <button
        type="button"
        aria-pressed={connected}
        onClick={onConnect}
        className={`${actionClass} ${
          connected ? 'border border-brand bg-brand-soft text-brand' : 'bg-brand text-on-brand hover:opacity-90'
        }`}
      >
        {connected && <Check className="animate-pop h-3.5 w-3.5" />}
        {connected ? 'Conectado' : 'Conectar'}
      </button>
    )
  }

  const to =
    tab === 'vacantes'
      ? item.id
        ? `/vacantes/${item.id}`
        : '/vacantes'
      : `/vacantes?q=${encodeURIComponent(item.nombre)}`

  return (
    <Link to={to} className={`${actionClass} bg-brand text-on-brand hover:opacity-90`}>
      {tab === 'vacantes' ? 'Postular' : 'Ver vacantes'}
    </Link>
  )
}

function Suggestions({ data, fallback }) {
  const [active, setActive] = useState('estudiantes')
  const [connections, toggleConnection] = useStoredSet('linkea-connections')
  const items = data[active]

  return (
    <Reveal>
      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">
            Sugerencias para ti
            {fallback[active] && (
              <span className="ml-3 align-middle font-body text-xs font-normal text-muted">Datos de ejemplo</span>
            )}
          </h2>
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
          {items.map((item, i) => {
            const id = item.id ?? item.nombre
            return (
              <article
                key={id}
                className={`${cardClass} animate-fade-in-up flex flex-col gap-4 p-5`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span className="tile flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-body text-sm font-semibold">
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
                <CardAction
                  tab={active}
                  item={item}
                  connected={connections.has(id)}
                  onConnect={() => toggleConnection(id)}
                />
              </article>
            )
          })}
        </div>
      </section>
    </Reveal>
  )
}

const MAX_FEATURED = 7

function Featured({ vacancies, fallback }) {
  const [saved, toggleSaved] = useStoredSet('linkea-saved')
  const [area, setArea] = useState('todas')

  const counts = useMemo(() => countByArea(vacancies), [vacancies])

  // "Todas" y las áreas fijas siempre aparecen; "Otros" solo si hay vacantes sin área conocida.
  const options = useMemo(() => {
    const areas = counts[OTROS.id] ? [...AREAS, OTROS] : AREAS
    return [
      { id: 'todas', label: 'Todas', count: vacancies.length, icon: LayoutGrid },
      ...areas.map((a) => ({ id: a.id, label: a.label, count: counts[a.id] ?? 0, icon: a.icon })),
    ]
  }, [counts, vacancies.length])

  const matching = area === 'todas' ? vacancies : vacancies.filter((v) => areaOf(v.sector) === area)
  const visible = matching.slice(0, MAX_FEATURED)
  const areaLabel = options.find((o) => o.id === area)?.label

  return (
    <section>
      <Reveal>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">
            Vacantes destacadas
            {fallback && (
              <span className="ml-3 align-middle font-body text-xs font-normal text-muted">Datos de ejemplo</span>
            )}
          </h2>
          <Link to="/vacantes" className="group flex items-center gap-1 font-body text-sm text-ink hover:text-brand">
            Ver más
            <ArrowRight className="h-4 w-4 text-brand transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </Reveal>

      <div className="mt-4">
        <AreaFilter options={options} value={area} onChange={setArea} />
      </div>

      <p aria-live="polite" className="mt-4 font-body text-xs text-muted">
        {matching.length === 0
          ? `Sin vacantes en ${areaLabel}`
          : `${matching.length} ${matching.length === 1 ? 'vacante' : 'vacantes'}${area === 'todas' ? '' : ` en ${areaLabel}`}`}
      </p>

      {/* key: al cambiar de área las tarjetas se vuelven a montar y entran en cascada, sin recargar la página */}
      {matching.length === 0 ? (
        <div
          key={area}
          className="animate-fade-in-up mt-3 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
            <SearchX className="h-5 w-5" />
          </span>
          <p className="font-heading text-lg text-ink">Aún no hay vacantes en {areaLabel}</p>
          <p className="max-w-sm font-body text-xs leading-relaxed text-muted">
            Pronto habrá nuevas oportunidades en esta área. Mientras tanto, puedes explorar las de otras áreas.
          </p>
          <button
            type="button"
            onClick={() => setArea('todas')}
            className="rounded-lg border border-line bg-surface px-4 py-2 font-body text-xs font-semibold text-ink transition-[border-color,transform] duration-200 hover:border-brand/50 active:scale-95"
          >
            Ver todas las vacantes
          </button>
        </div>
      ) : (
        <div key={area} className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visible.map((v, i) => (
            <div key={v.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
              <VacancyCard vacancy={v} saved={saved.has(v.id)} onToggleSave={() => toggleSaved(v.id)} />
            </div>
          ))}

          <div className="animate-fade-in-up" style={{ animationDelay: `${visible.length * 70}ms` }}>
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
          </div>
        </div>
      )}
    </section>
  )
}

export default function Home() {
  const { sugerencias, destacadas, fallback } = useHomeData()

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <Hero />
      <StatsRow />
      <Suggestions data={sugerencias} fallback={fallback} />
      <Featured vacancies={destacadas} fallback={fallback.destacadas} />
    </div>
  )
}
