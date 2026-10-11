import { useState } from 'react'
import { Bell, FileCheck2, MessageCircle, Sparkles } from 'lucide-react'
import PageTitle from '../components/layout/PageTitle'
import PreviewNotice from '../components/layout/PreviewNotice'
import { notificaciones as inicial } from '../data/mockSocial'

const iconos = { match: Sparkles, postulacion: FileCheck2, mensaje: MessageCircle, sistema: Bell }

export default function Notificaciones() {
  const [items, setItems] = useState(inicial)
  const [soloNuevas, setSoloNuevas] = useState(false)

  const sinLeer = items.filter((n) => !n.leida).length
  const visibles = soloNuevas ? items.filter((n) => !n.leida) : items

  const marcar = (id) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)))

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle title="Notificaciones" subtitle="Novedades de tus vacantes, postulaciones y mensajes.">
        <button
          type="button"
          disabled={sinLeer === 0}
          onClick={() => setItems((prev) => prev.map((n) => ({ ...n, leida: true })))}
          className="rounded-lg border border-line bg-surface px-4 py-2.5 font-body text-xs font-semibold text-ink hover:border-cocoa/50 disabled:opacity-50"
        >
          Marcar todas como leídas
        </button>
      </PageTitle>

      <PreviewNotice>Las notificaciones son de ejemplo: todavía no existe el servicio que las genera.</PreviewNotice>

      <div className="flex gap-2" role="tablist" aria-label="Filtrar notificaciones">
        {[
          { id: false, label: `Todas ${items.length}` },
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

      {visibles.length === 0 ? (
        <p className="panel p-10 text-center font-body text-sm text-muted">No tienes notificaciones sin leer.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibles.map((n) => {
            const Icon = iconos[n.tipo] ?? Bell
            return (
              <li key={n.id}>
                <button
                  type="button"
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
                  <span className="shrink-0 font-body text-[11px] text-muted">{n.hace}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
