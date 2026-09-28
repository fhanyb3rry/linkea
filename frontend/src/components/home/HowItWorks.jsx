import { FileUser, Sparkles, Handshake } from 'lucide-react'
import Reveal from './Reveal'

const steps = [
  {
    icon: FileUser,
    title: 'Crea tu perfil',
    description: 'Cuéntanos tu carrera, habilidades y disponibilidad en minutos.',
  },
  {
    icon: Sparkles,
    title: 'Recibe matches con IA',
    description: 'Nuestro motor evalúa compatibilidad real entre tu perfil y cada vacante.',
  },
  {
    icon: Handshake,
    title: 'Aplica y conecta',
    description: 'Postúlate a las vacantes con mejor match y conecta con la empresa.',
  },
]

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <Reveal className="text-center">
        <h2 className="text-2xl sm:text-3xl">Cómo funciona</h2>
        <p className="mt-2 font-body text-sm text-gris-pizarra">
          Tres pasos para encontrar tu próxima práctica profesional.
        </p>
      </Reveal>

      <div className="relative mt-12 grid gap-10 sm:grid-cols-3">
        <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-azul-marino/20 to-transparent sm:block" />

        {steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 150} className="relative flex flex-col items-center text-center">
            <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-blanco text-cafe-avellana shadow-md ring-4 ring-beige-almendra transition-transform duration-300 hover:-translate-y-1 hover:rotate-3">
              <step.icon className="h-7 w-7" />
              <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-azul-marino font-body text-xs font-bold text-blanco">
                {index + 1}
              </span>
            </span>
            <h3 className="mt-4 font-heading text-lg font-semibold text-azul-marino">{step.title}</h3>
            <p className="mt-1 max-w-xs font-body text-sm text-gris-pizarra">{step.description}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
