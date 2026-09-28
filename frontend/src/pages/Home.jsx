import { Link } from 'react-router-dom'
import { ArrowRight, Briefcase, Building2, Sparkles, User } from 'lucide-react'
import StatItem from '../components/home/StatItem'
import InfoFloatCard from '../components/home/InfoFloatCard'
import RadialStat from '../components/home/RadialStat'
import VerifiedCountBadge from '../components/home/VerifiedCountBadge'
import SearchBar from '../components/home/SearchBar'
import CategoryPills from '../components/home/CategoryPills'
import FeaturedOpportunityCard from '../components/home/FeaturedOpportunityCard'
import GrowthCtaCard from '../components/home/GrowthCtaCard'
import LogoMarquee from '../components/home/LogoMarquee'
import HowItWorks from '../components/home/HowItWorks'
import Reveal from '../components/home/Reveal'

const featuredOpportunities = [
  {
    logoIniciales: 'GPP',
    matchPercentage: 92,
    nombre: 'GPP Soluciones',
    categoria: 'Desarrollo Web (Prácticas)',
    zona: 'Toluca, Edo. Méx.',
    modalidad: 'remoto',
    skills: ['React', 'Python', 'Trabajo en equipo'],
  },
  {
    logoIniciales: 'STL',
    matchPercentage: 86,
    nombre: 'Stellantis',
    categoria: 'Soporte TI',
    zona: 'Toluca, Edo. Méx.',
    modalidad: 'presencial',
    skills: ['Redes', 'Soporte técnico', 'Sistemas'],
  },
  {
    logoIniciales: 'TEC',
    matchPercentage: 84,
    nombre: 'Tecnológico de Monterrey',
    categoria: 'Ciberseguridad',
    zona: 'Lerma, Edo. Méx.',
    modalidad: 'hibrido',
    skills: ['Seguridad', 'Análisis', 'Python'],
  },
  {
    logoIniciales: 'NES',
    matchPercentage: 78,
    nombre: 'Nestlé',
    categoria: 'Análisis de Datos',
    zona: 'Lerma, Edo. Méx.',
    modalidad: 'remoto',
    skills: ['SQL', 'Python', 'Power BI'],
  },
]

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-beige-almendra">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full bg-blanco px-3 py-1 font-body text-xs font-semibold tracking-wide text-azul-marino shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-cafe-avellana" />
              MÁS QUE PRÁCTICAS
            </span>

            <h1 className="animate-fade-in-up mt-4 font-heading text-4xl font-semibold leading-tight text-azul-marino [animation-delay:100ms] sm:text-5xl">
              Tu talento
              <br />
              <em className="text-cafe-avellana not-italic italic">también mueve</em>
              <br />
              el mundo.
            </h1>

            <p className="animate-fade-in-up mt-4 max-w-md font-body text-base text-gris-pizarra [animation-delay:200ms]">
              Linkea conecta estudiantes y empresas para crear experiencias profesionales que
              impulsan el futuro.
            </p>

            <div className="animate-fade-in-up mt-6 flex flex-wrap gap-3 [animation-delay:300ms]">
              <a
                href="/vacantes"
                className="group flex items-center gap-2 rounded-full bg-cafe-avellana px-5 py-3 font-body text-sm font-semibold text-blanco transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-cafe-avellana/30 active:scale-95"
              >
                Explorar vacantes
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <Link
                to="/vacantes/nueva"
                className="rounded-full border border-azul-marino/20 bg-blanco px-5 py-3 font-body text-sm font-semibold text-azul-marino transition-all duration-300 hover:scale-[1.03] hover:bg-beige-almendra active:scale-95"
              >
                Soy empresa
              </Link>
            </div>

            <div className="animate-fade-in-up mt-8 flex flex-wrap gap-6 [animation-delay:400ms]">
              <StatItem icon={User} value="+2,500" label="Estudiantes conectados" />
              <StatItem icon={Building2} value="+120" label="Empresas aliadas" />
              <StatItem icon={Briefcase} value="+1,800" label="Vacantes publicadas" />
            </div>
          </div>

          {/* Panel decorativo con tarjetas flotantes (reemplaza la foto) */}
          <div className="relative">
            <div className="hidden min-h-[480px] md:block">
              <div className="absolute inset-4 overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#FBF7F2_0%,#F2ECE4_35%,#E4CDAE_70%,#C9A06C_100%)] shadow-xl shadow-cafe-avellana/20 ring-1 ring-azul-marino/5">
                <div className="bg-dot-grid-warm absolute inset-0 opacity-40" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.6),transparent_50%)]" />

                <div className="animate-blob absolute -left-16 top-16 h-64 w-64 rounded-full bg-cafe-avellana/25 blur-3xl" />
                <div className="animate-blob absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-cafe-avellana/30 blur-3xl [animation-delay:2s]" />
                <div className="animate-blob absolute right-16 top-0 h-40 w-40 rounded-full bg-blanco/50 blur-2xl [animation-delay:4s]" />

                <Sparkles className="absolute right-9 top-9 h-7 w-7 text-cafe-avellana/30" />
                <Sparkles className="absolute bottom-16 left-12 h-4 w-4 text-azul-marino/20" />

                <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-blanco/40" />
              </div>

              <div className="animate-fade-in-up animate-float absolute left-2 top-8 w-64 [animation-delay:500ms]">
                <InfoFloatCard
                  glass
                  icon={Sparkles}
                  title="Recomendaciones personalizadas"
                  description="Oportunidades basadas en tu perfil, habilidades y experiencia."
                  className="-rotate-2 shadow-xl shadow-azul-marino/20"
                />
              </div>

              <div className="animate-fade-in-up animate-float absolute right-4 top-[210px] w-64 [animation-delay:700ms] [animation-duration:6s]">
                <InfoFloatCard
                  glass
                  icon={Building2}
                  title="Empresas reales"
                  description="Con oportunidades verificadas."
                  trailing={<VerifiedCountBadge value="+120" />}
                  className="rotate-1 shadow-xl shadow-azul-marino/20"
                />
              </div>

              <div className="animate-fade-in-up animate-float absolute bottom-8 left-10 w-64 [animation-delay:900ms] [animation-duration:5.5s]">
                <InfoFloatCard
                  glass
                  icon={User}
                  title="Match con IA"
                  description="Encuentra vacantes compatibles con tu perfil."
                  trailing={<RadialStat value={92} />}
                  className="-rotate-1 shadow-xl shadow-azul-marino/20"
                />
              </div>
            </div>

            {/* Fallback apilado para móvil/tablet */}
            <div className="flex flex-col gap-4 md:hidden">
              <InfoFloatCard
                icon={Sparkles}
                title="Recomendaciones personalizadas"
                description="Oportunidades basadas en tu perfil, habilidades y experiencia."
              />
              <InfoFloatCard
                icon={Building2}
                title="Empresas reales"
                description="Con oportunidades verificadas."
                trailing={<VerifiedCountBadge value="+120" />}
              />
              <InfoFloatCard
                icon={User}
                title="Match con IA"
                description="Encuentra vacantes compatibles con tu perfil."
                trailing={<RadialStat value={92} />}
              />
            </div>
          </div>
        </div>

        <div className="animate-fade-in-up mx-auto max-w-7xl px-4 pb-12 sm:px-6 [animation-delay:500ms]">
          <SearchBar />
          <div className="mt-4">
            <CategoryPills />
          </div>
        </div>
      </section>

      <LogoMarquee />

      <HowItWorks />

      <section className="relative overflow-hidden px-4 py-16 sm:px-6">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cafe-avellana/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-azul-marino/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <Reveal className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl">Oportunidades destacadas</h2>
              <p className="mt-1 font-body text-sm text-gris-pizarra">
                Vacantes verificadas por empresas reales.
              </p>
            </div>
            <a
              href="/vacantes"
              className="group flex items-center gap-1 font-body text-sm font-medium text-cafe-avellana hover:underline"
            >
              Ver todas
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </Reveal>

          <div className="mt-6 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {featuredOpportunities.map((opportunity, index) => (
              <Reveal key={opportunity.nombre} delay={index * 100}>
                <FeaturedOpportunityCard opportunity={opportunity} />
              </Reveal>
            ))}
            <Reveal delay={featuredOpportunities.length * 100}>
              <GrowthCtaCard />
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  )
}
