import { ArrowRight } from 'lucide-react'

export default function GrowthCtaCard() {
  return (
    <article className="flex flex-col justify-between gap-4 rounded-2xl bg-azul-marino p-6 text-blanco shadow-sm">
      <div>
        <h3 className="font-heading text-xl font-semibold text-blanco">Impulsa tu crecimiento profesional</h3>
        <p className="mt-2 font-body text-sm text-blanco/80">
          Explora, aprende y conecta con empresas que creen en tu talento.
        </p>
      </div>
      <button
        type="button"
        className="flex w-fit items-center gap-1.5 rounded-full bg-cafe-avellana px-4 py-2 font-body text-sm font-medium text-blanco transition-opacity hover:opacity-90"
      >
        Ver cómo funciona
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  )
}
