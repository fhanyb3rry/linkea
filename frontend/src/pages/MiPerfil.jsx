import { Navigate } from 'react-router-dom'
import NeedsProfile from '../components/layout/NeedsProfile'
import PageTitle from '../components/layout/PageTitle'
import useActiveStudent from '../hooks/useActiveStudent'

// /perfil lleva al perfil del estudiante activo.
export default function MiPerfil() {
  const [studentId] = useActiveStudent()
  if (studentId) return <Navigate to={`/estudiantes/${studentId}`} replace />

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageTitle title="Mi perfil" subtitle="Aquí verás y editarás tu información, habilidades y currículum." />
      <NeedsProfile />
    </section>
  )
}
