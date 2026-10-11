import PageTitle from '../components/layout/PageTitle'
import PerfilForm from '../components/forms/PerfilForm'

export default function CrearPerfilEstudiante() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageTitle
        title="Crea tu perfil"
        subtitle="Con esta información Linkea calcula tu elegibilidad y tu compatibilidad con cada vacante. Puedes completarlo después."
        back={{ to: '/estudiantes', label: 'Estudiantes' }}
      />
      <PerfilForm mode="crear" />
    </section>
  )
}
