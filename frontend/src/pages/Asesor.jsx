import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CalendarCheck, MapPin, Route, UserRound, Users } from 'lucide-react'
import ListState from '../components/layout/ListState'
import PageTitle from '../components/layout/PageTitle'
import useFetch from '../hooks/useFetch'
import { ESTADO_SEGUIMIENTO } from '../lib/seguimiento'
import { getOrganizations, getSeguimientos, getStudents, getTrasladoDistancia, getTrasladoMapa, getTrasladoUsuario } from '../services/api'

// El grupo del asesor: alumnos con estadía en curso, alumnos que aún no tienen
// lugar y las empresas donde están. Todo sale de sus propios seguimientos.

function TarjetaEmpresa({ org, detalle }) {
  return (
    <Link to={`/organizaciones/${org.id}`} className="card flex items-start gap-3 p-5 transition-colors hover:border-cocoa/40">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cocoa-soft text-cocoa">
        <Building2 className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-base font-semibold text-ink">{org.nombre}</p>
        <p className="font-body text-xs text-muted">{org.sector}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-cocoa" />
            {org.ubicacion?.zona}
          </span>
          {detalle && <span>{detalle}</span>}
        </div>
      </div>
    </Link>
  )
}

function Seccion({ icono: Icono, titulo, subtitulo, children }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2.5 font-heading text-xl font-medium text-ink">
          <Icono className="h-5 w-5 text-brand" />
          {titulo}
        </h2>
        {subtitulo && <p className="mt-1 font-body text-sm text-muted">{subtitulo}</p>}
      </div>
      {children}
    </section>
  )
}

// Ordena las visitas con el vecino más cercano y calcula cada tramo con los
// mismos algoritmos de traslado que usa el resto de la app.
function PlanVisitas({ origen, destinos }) {
  const [plan, setPlan] = useState({ key: '', datos: null, error: null })
  const key = `${origen}|${destinos.join(',')}`

  useEffect(() => {
    if (!origen || destinos.length === 0) return undefined
    let cancelado = false
    setPlan({ key: '', datos: null, error: null })

    async function calcular() {
      // 1) Orden sugerido: en cada paso, la empresa más cercana a donde estás.
      const puntos = [origen, ...destinos]
      const minutos = {}
      for (const a of puntos) {
        for (const b of puntos) {
          if (a === b) continue
          const d = await getTrasladoDistancia({ desde: a, hasta: b, tipo: 'euclidiana' })
          minutos[`${a}|${b}`] = d.minutos_h ?? 0
        }
      }
      const restantes = [...destinos]
      const orden = []
      let actual = origen
      while (restantes.length) {
        restantes.sort((x, y) => minutos[`${actual}|${x}`] - minutos[`${actual}|${y}`])
        const siguiente = restantes.shift()
        orden.push(siguiente)
        actual = siguiente
      }

      // 2) Detalle de cada tramo con la ruta real (A*).
      const tramos = []
      let previo = origen
      for (const destino of orden) {
        const detalle = await getTrasladoUsuario({ desde: previo, hasta: destino })
        tramos.push({ desde: previo, hasta: destino, ...detalle })
        previo = destino
      }
      const total = tramos.reduce((s, t) => s + (t.minutos ?? 0), 0)
      if (!cancelado) setPlan({ key, datos: { orden, tramos, total }, error: null })
    }

    calcular().catch((err) => !cancelado && setPlan({ key, datos: null, error: err.message }))
    return () => {
      cancelado = true
    }
  }, [key, origen, destinos])

  const actual = plan.key === key ? plan : null

  if (destinos.length === 0) {
    return <p className="font-body text-sm text-muted">No hay visitas programadas: tus alumnos aún no tienen estadía en curso.</p>
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <ol className="flex flex-col gap-3">
        {actual?.datos?.tramos.map((t, i) => (
          <li key={`${t.desde}-${t.hasta}-${i}`} className="flex flex-wrap items-center gap-2 font-body text-sm text-ink">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">
              {i + 1}
            </span>
            <span>
              {t.desde} <span className="text-muted">→</span> <b>{t.hasta}</b>
            </span>
            <span className="ml-auto rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-ink">
              {t.misma_zona ? 'Misma zona' : `Unos ${t.minutos} min`}
            </span>
          </li>
        ))}
        {!actual?.datos && !actual?.error && (
          <li className="flex items-center gap-2 font-body text-sm text-muted">
            <Route className="h-4 w-4 animate-pulse" /> Calculando la mejor ruta…
          </li>
        )}
      </ol>

      {actual?.error && <p className="font-body text-sm text-brand">No se pudo calcular la ruta: {actual.error}</p>}

      {actual?.datos && (
        <p className="border-t border-line pt-3 font-body text-sm text-ink">
          Recorrido completo: <b>unas {actual.datos.total} min</b> entre las {actual.datos.tramos.length} paradas,
          en el orden que menos te hace trasladarte.
        </p>
      )}
    </div>
  )
}

export default function Asesor() {
  const { data, error, loading } = useFetch(
    () => Promise.all([getSeguimientos(), getOrganizations(), getStudents(), getTrasladoMapa()]),
    []
  )
  const [origen, setOrigen] = useState('')

  const [seguimientos, orgs, students, mapa] = data ?? [[], [], [], null]

  const orgPorId = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs])

  // Solo las estadías vivas cuentan para visitas y empresas.
  const activas = seguimientos.filter((s) => s.estado === 'en_curso')
  const empresasIds = useMemo(() => new Set(activas.map((s) => s.organizacion_id).filter(Boolean)), [activas])
  const misEmpresas = orgs.filter((o) => empresasIds.has(o.id))

  // "Sin lugar" = el alumno sigue activo (en_proceso ya aceptó una vacante).
  const pendientes = students.filter((s) => s.estado === 'activo')

  const destinos = useMemo(() => {
    const zonas = new Set()
    for (const s of activas) {
      const zona = orgPorId.get(s.organizacion_id)?.ubicacion?.zona
      if (zona) zonas.add(zona)
    }
    return [...zonas]
  }, [activas, orgPorId])

  const zonas = useMemo(() => (mapa ? mapa.zonas.map((z) => z.nombre) : []), [mapa])
  const origenEfectivo = origen || zonas[0] || ''

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6">
      <PageTitle
        title="Mi grupo"
        subtitle="Tus alumnos, las empresas donde hacen su estadía y las que todavía no tienen lugar."
      />

      <ListState loading={loading} error={error} empty={false} />

      {!loading && !error && (
        <>
          <Seccion
            icono={CalendarCheck}
            titulo="Alumnos con lugar asignado"
            subtitulo={`${activas.length} ${activas.length === 1 ? 'estadía en curso' : 'estadías en curso'}.`}
          >
            {activas.length === 0 ? (
              <p className="font-body text-sm text-muted">Aún no tienes alumnos con estadía en curso.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {activas.map((s) => {
                  const org = orgPorId.get(s.organizacion_id)
                  const estado = ESTADO_SEGUIMIENTO[s.estado] ?? { label: s.estado, className: 'bg-canvas text-ink' }
                  return (
                    <Link
                      key={s.id}
                      to={`/seguimientos/${s.id}`}
                      className="card flex flex-col gap-3 p-5 transition-colors hover:border-cocoa/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-body text-base font-semibold text-ink">{s.estudiante_nombre}</p>
                          <p className="truncate font-body text-xs text-muted">{s.vacante_titulo}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${estado.className}`}>
                          {estado.label}
                        </span>
                      </div>
                      {org && (
                        <p className="flex items-center gap-1.5 font-body text-xs text-muted">
                          <Building2 className="h-3.5 w-3.5 text-cocoa" />
                          {org.nombre} · {org.ubicacion?.zona}
                        </p>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </Seccion>

          <Seccion
            icono={Users}
            titulo="Alumnos sin lugar asignado"
            subtitulo="Tu lista de chequeo: a quién falta conseguirle una vacante para sus prácticas."
          >
            {pendientes.length === 0 ? (
              <p className="font-body text-sm text-muted">Todos los alumnos registrados ya tienen lugar.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pendientes.map((s) => (
                  <Link
                    key={s.id}
                    to={`/estudiantes/${s.id}`}
                    className="card flex items-start gap-3 p-5 transition-colors hover:border-cocoa/40"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-body text-sm font-semibold text-brand">
                      {s.nombre?.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-base font-semibold text-ink">{s.nombre}</p>
                      <p className="truncate font-body text-xs text-muted">
                        {s.carrera} · {s.semestre}º semestre
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 font-body text-xs text-muted">
                        <MapPin className="h-3 w-3 text-cocoa" />
                        {s.ubicacion?.zona ?? 'Sin zona'}
                        {s.skills?.length > 0 && ` · ${s.skills.slice(0, 3).join(', ')}`}
                      </p>
                    </div>
                    <UserRound className="h-4 w-4 shrink-0 text-muted" />
                  </Link>
                ))}
              </div>
            )}
          </Seccion>

          <Seccion
            icono={Building2}
            titulo="Empresas de tus alumnos"
            subtitulo="Solo las organizaciones donde están los alumnos de tu grupo."
          >
            {misEmpresas.length === 0 ? (
              <p className="font-body text-sm text-muted">Aún no hay empresas asignadas a tus alumnos.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {misEmpresas.map((o) => {
                  const cuantos = activas.filter((s) => s.organizacion_id === o.id).length
                  return (
                    <TarjetaEmpresa
                      key={o.id}
                      org={o}
                      detalle={`${cuantos} ${cuantos === 1 ? 'alumno' : 'alumnos'} en estadía`}
                    />
                  )
                })}
              </div>
            )}
          </Seccion>

          <Seccion
            icono={Route}
            titulo="Plan de visitas"
            subtitulo="El orden que menos te hace trasladarte entre las empresas de tus alumnos."
          >
            {zonas.length > 0 && (
              <label className="flex w-fit flex-col gap-1.5 font-body text-xs font-semibold text-ink">
                Sales de
                <select
                  value={origenEfectivo}
                  onChange={(e) => setOrigen(e.target.value)}
                  className="rounded-xl border border-line bg-surface px-4 py-2.5 font-body text-sm text-ink focus:border-cocoa focus:outline-none"
                >
                  {zonas.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </label>
            )}
            <PlanVisitas origen={origenEfectivo} destinos={destinos} />
          </Seccion>
        </>
      )}
    </section>
  )
}
