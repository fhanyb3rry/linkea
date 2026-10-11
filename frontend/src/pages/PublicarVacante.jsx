import PageTitle from '../components/layout/PageTitle'
import VacanteForm from '../components/forms/VacanteForm'

export default function PublicarVacante() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageTitle
        title="Publica una vacante"
        subtitle="Al publicar, Linkea evalúa automáticamente qué estudiantes son elegibles y qué tan compatibles son."
        back={{ to: '/empresa', label: 'Mi empresa' }}
      />
      <VacanteForm mode="crear" />
    </section>
  )
}
