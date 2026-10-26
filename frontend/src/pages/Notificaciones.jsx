import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, FileCheck2, Sparkles, UserPlus } from 'lucide-react'
import ListState from '../components/layout/ListState'
import PageTitle from '../components/layout/PageTitle'
import { useAuth } from '../context/auth'
import useActiveStudent from '../hooks/useActiveStudent'
import {
  avisarSinLeer,
  cargarNotificaciones,
  guardarLeidas,
  hace,
  leidasGuardadas,
} from '../lib/notificaciones'

const iconos = { match: Sparkles, postulacion: FileCheck2, postulante: UserPlus, sistema: Bell }

export default function Notificaciones() {
  const { usuario } = useAuth()
  const rol = usuario?.rol
  const [activeStudent] = useActiveStudent()
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [leidas, setLeidas] = useState(leidasGuardadas)
  const [soloNuevas, setSoloNuevas] = useState(false)

  useEffect(() => {
    let cancel = false
    cargarNotificaciones(rol, activeStudent)
      .then((lista) => {
        if (cancel) return
        setItems(lista)
        setError(null)
      })
      .catch((err) => !cancel && setError(err.message))
    return () => {
      cancel = true
    }
  }, [rol, activeStudent])

  const marcar = (id) =>
    setLeidas((prev) => {
      const next = new Set(prev).add(id)
      guardarLeidas(next)
      return next
    })

  const conEstado = useMemo(() => (items ?? []).map((n) => ({ ...n, leida: leidas.has(n.id) })), [items, leidas])
  const sinLeer = conEstado.filter((n) => !n.leida).length
  const visibles = soloNuevas ? conEstado.filter((n) => !n.leida) : conEstado

  // La campana de la barra superior muestra el punto solo si hay algo sin leer.
  useEffect(() => {
    avisarSinLeer(sinLeer)
  }, [sinLeer])

  const marcarTodas = () =>
    setLeidas((prev) => {
      const next = new Set([...prev, ...conEstado.map((n) => n.id)])
      guardarLeidas(next)
      return next
    })

  const subtitulo = {
    estudiante: 'Cómo van tus postulaciones, al momento.',
    empresa: 'Quién se postula a tus vacantes, al momento.',
  }[rol] ?? 'Actividad reciente de las postulaciones.'

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle title="Notificaciones" subtitle={subtitulo}>
        <button
          type="button"
          disabled={sinLeer === 0}
          onClick={marcarTodas}
          className="rounded-lg border border-line bg-surface px-4 py-2.5 font-body text-xs font-semibold text-ink hover:border-cocoa/50 disabled:opacity-50"
        >
          Marcar todas como leídas
        </button>
      </PageTitle>

      {items !== null && !error && (
        <div className="flex gap-2" role="tablist" aria-label="Filtrar notificaciones">
          {[
            { id: false, label: `Todas ${conEstado.length}` },
            { id: true, label: `Sin leer ${sinLeer}` },
          ].map(({ id, label }) => (
            <button
              key={String(id)}
              type="button"
              role="tab"
              aria-selected={soloNuevas === id}
              onClick={() => setSoloNuevas(id)}
              className={`rounded-full border px-4 py-1.5 font-body text-xs font-medium transition-colors ${
                soloNuevas === id ? 'border-cocoa bg-cocoa text-on-cocoa' : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <ListState
        loading={items === null && !error}
        error={error}
        empty={items !== null && !error && visibles.length === 0}
        emptyText={soloNuevas ? 'No tienes notificaciones sin leer.' : 'Sin notificaciones todavía.'}
      />

      {visibles.length > 0 && (
        <ul className="flex flex-col gap-3">
          {visibles.map((n) => {
            const Icon = iconos[n.tipo] ?? Bell
            return (
              <li key={n.id}>
                <Link
                  to={n.to ?? '/inicio'}
                  onClick={() => marcar(n.id)}
                  className={`card flex w-full items-start gap-4 p-4 text-left ${n.leida ? 'opacity-70' : ''}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cocoa-soft text-cocoa">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-body text-sm font-semibold text-ink">{n.titulo}</span>
                      {!n.leida && <span className="h-2 w-2 rounded-full bg-brand" aria-label="Sin leer" />}
                    </span>
                    <span className="mt-0.5 block font-body text-xs leading-relaxed text-muted">{n.texto}</span>
                  </span>
                  <span className="shrink-0 font-body text-[11px] text-muted">{hace(n.fecha)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
