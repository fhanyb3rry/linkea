import ListState from '../components/layout/ListState'
import PageTitle from '../components/layout/PageTitle'
import OrganizacionForm from '../components/forms/OrganizacionForm'
import { useAuth } from '../context/auth'
import useFetch from '../hooks/useFetch'
import { getOrganization } from '../services/api'

export default function EditarOrganizacion() {
  const { usuario } = useAuth()
  const orgId = usuario?.perfil_id
  const { data: org, error, loading } = useFetch(() => getOrganization(orgId), [orgId], Boolean(orgId))

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageTitle
        title="Editar organización"
        subtitle="Si cambias el nombre, se actualiza también en todas tus vacantes."
        back={{ to: '/empresa', label: 'Mi empresa' }}
      />
      <ListState loading={loading} error={error} />
      {org && <OrganizacionForm key={org.id} mode="editar" initial={org} />}
    </section>
  )
}
