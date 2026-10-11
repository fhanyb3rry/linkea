import { useParams } from 'react-router-dom'
import ListState from '../components/layout/ListState'
import PageTitle from '../components/layout/PageTitle'
import VacanteForm from '../components/forms/VacanteForm'
import useFetch from '../hooks/useFetch'
import { getVacancy } from '../services/api'

export default function EditarVacante() {
  const { id } = useParams()
  const { data: vacancy, error, loading } = useFetch(() => getVacancy(id), [id])

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageTitle
        title="Editar vacante"
        subtitle="Los cambios se reflejan de inmediato en la elegibilidad de los candidatos."
        back={{ to: '/empresa', label: 'Mi empresa' }}
      />
      <ListState loading={loading} error={error} />
      {vacancy && <VacanteForm key={vacancy.id} mode="editar" initial={vacancy} />}
    </section>
  )
}
