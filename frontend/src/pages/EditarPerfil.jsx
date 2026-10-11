import ListState from '../components/layout/ListState'
import NeedsProfile from '../components/layout/NeedsProfile'
import PageTitle from '../components/layout/PageTitle'
import PerfilForm from '../components/forms/PerfilForm'
import useActiveStudent from '../hooks/useActiveStudent'
import useFetch from '../hooks/useFetch'
import { getStudent } from '../services/api'

export default function EditarPerfil() {
  const [studentId] = useActiveStudent()
  const { data: student, error, loading } = useFetch(() => getStudent(studentId), [studentId], Boolean(studentId))

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageTitle
        title="Editar perfil"
        subtitle="Mantén tu información al día para mejorar tus coincidencias."
        back={studentId ? { to: `/estudiantes/${studentId}`, label: 'Mi perfil' } : undefined}
      />

      {!studentId && <NeedsProfile />}
      <ListState loading={loading} error={error} />
      {/* key: si cambia el perfil activo, el formulario se reinicia con los datos nuevos */}
      {student && <PerfilForm key={student.id} mode="editar" initial={student} />}
    </section>
  )
}
