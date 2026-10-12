import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, MapPin } from 'lucide-react'
import ListState from '../components/layout/ListState'
import PageHeader from '../components/layout/PageHeader'
import useFetch from '../hooks/useFetch'
import { getOrganizations, getVacancies } from '../services/api'

export default function Organizaciones() {
  const { data, error, loading } = useFetch(() => Promise.all([getOrganizations(), getVacancies()]), [])
  const [search, setSearch] = useState('')
  const [orgs, vacancies] = data ?? [[], []]

  // Cuántas vacantes tiene publicadas cada organización.
  const conteo = new Map()
  for (const v of vacancies) conteo.set(v.organizacion_id, (conteo.get(v.organizacion_id) ?? 0) + 1)

  const q = search.trim().toLowerCase()
  const filtered = orgs.filter((o) => !q || [o.nombre, o.sector, o.ubicacion?.zona].join(' ').toLowerCase().includes(q))

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Empresas"
        subtitle="Organizaciones que reciben practicantes de estadía."
        count={loading || error ? undefined : orgs.length}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar por nombre, área o zona..."
      />

      <ListState
        loading={loading}
        error={error}
        empty={!loading && !error && filtered.length === 0}
        emptyText={orgs.length === 0 ? 'Aún no hay organizaciones registradas.' : 'Ninguna organización coincide con tu búsqueda.'}
      />

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => (
            <Link key={o.id} to={`/organizaciones/${o.id}`} className="card flex items-start gap-3 p-5 transition-colors hover:border-cocoa/40">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cocoa-soft text-cocoa">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-base font-semibold text-ink">{o.nombre}</p>
                <p className="font-body text-xs text-muted">{o.sector}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-cocoa" />
                    {o.ubicacion.zona}
                  </span>
                  <span>
                    {conteo.get(o.id) ?? 0} {conteo.get(o.id) === 1 ? 'vacante' : 'vacantes'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
