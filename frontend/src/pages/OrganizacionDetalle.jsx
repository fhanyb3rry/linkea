import { useParams } from 'react-router-dom'
import { Building2, Globe, Mail, MapPin, Phone, UserRound } from 'lucide-react'
import VacancyCard from '../components/cards/VacancyCard'
import ListState from '../components/layout/ListState'
import PageTitle from '../components/layout/PageTitle'
import useFetch from '../hooks/useFetch'
import useStoredSet from '../hooks/useStoredSet'
import { getOrganization, getVacancies } from '../services/api'

function Dato({ icon: Icon, children }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-cocoa" />
      {children}
    </span>
  )
}

export default function OrganizacionDetalle() {
  const { id } = useParams()
  const { data, error, loading } = useFetch(() => Promise.all([getOrganization(id), getVacancies(id)]), [id])
  const [saved, toggleSaved] = useStoredSet('linkea-saved')
  const [org, vacancies] = data ?? [null, []]
  const contacto = org?.contacto ?? {}

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle title={org?.nombre ?? 'Organización'} back={{ to: '/organizaciones', label: 'Empresas' }} />
      <ListState loading={loading} error={error} />

      {org && (
        <>
          <header className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cocoa-soft text-cocoa">
              <Building2 className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm font-medium text-brand">{org.sector}</p>
              {org.descripcion && <p className="mt-2 font-body text-sm leading-relaxed text-ink">{org.descripcion}</p>}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-body text-xs text-muted">
                <Dato icon={MapPin}>{org.ubicacion.zona}</Dato>
                {contacto.responsable && (
                  <Dato icon={UserRound}>
                    {contacto.responsable}
                    {contacto.cargo && ` · ${contacto.cargo}`}
                  </Dato>
                )}
                {contacto.correo && <Dato icon={Mail}>{contacto.correo}</Dato>}
                {contacto.telefono && <Dato icon={Phone}>{contacto.telefono}</Dato>}
                {contacto.sitio && (
                  <Dato icon={Globe}>
                    <a href={contacto.sitio} target="_blank" rel="noreferrer" className="hover:text-brand hover:underline">
                      {contacto.sitio.replace(/^https?:\/\//, '')}
                    </a>
                  </Dato>
                )}
              </div>
            </div>
          </header>

          <h2 className="text-xl">Vacantes publicadas</h2>
          <ListState empty={vacancies.length === 0} emptyText="Esta organización no tiene vacantes publicadas por ahora." />
          {vacancies.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {vacancies.map((v) => (
                <VacancyCard key={v.id} vacancy={v} saved={saved.has(v.id)} onToggleSave={() => toggleSaved(v.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
