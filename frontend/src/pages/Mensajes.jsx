import { useState } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import PageTitle from '../components/layout/PageTitle'
import PreviewNotice from '../components/layout/PreviewNotice'
import { useAuth } from '../context/auth'
import { conversacionesPara } from '../data/mockSocial'
import { initials } from '../lib/perfil'

const SUBTITULO = {
  estudiante: 'Conversa con las empresas que revisan tus postulaciones.',
  empresa: 'Conversa con los estudiantes que se postulan a tus vacantes.',
}

export default function Mensajes() {
  const { usuario } = useAuth()
  const [chats, setChats] = useState(() => conversacionesPara(usuario?.rol))
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState('')

  const selected = chats.find((c) => c.id === selectedId) ?? null

  function open(id) {
    setSelectedId(id)
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, noLeidos: 0 } : c)))
  }

  function send(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !selected) return
    setChats((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, mensajes: [...c.mensajes, { de: 'yo', texto: text, hora: 'Ahora' }] } : c)),
    )
    setDraft('')
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle title="Mensajes" subtitle={SUBTITULO[usuario?.rol] ?? 'Mensajes de la plataforma.'} />
      <PreviewNotice>Los mensajes de esta pantalla son de ejemplo y no se envían: todavía no existe el servicio de mensajería.</PreviewNotice>

      <div className="panel grid min-h-[30rem] overflow-hidden lg:grid-cols-[20rem_1fr]">
        <ul className={`flex-col divide-y divide-line border-r border-line ${selected ? 'hidden lg:flex' : 'flex'}`}>
          {chats.map((c) => {
            const last = c.mensajes[c.mensajes.length - 1]
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => open(c.id)}
                  className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-canvas ${
                    selectedId === c.id ? 'bg-canvas' : ''
                  }`}
                >
                  <span className="tile flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-body text-sm font-semibold">
                    {initials(c.nombre)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-body text-sm font-semibold text-ink">{c.nombre}</span>
                      <span className="shrink-0 font-body text-[11px] text-muted">{last.hora}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-body text-xs text-muted">{last.texto}</span>
                      {c.noLeidos > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-on-brand">
                          {c.noLeidos}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className={`flex-col ${selected ? 'flex' : 'hidden lg:flex'}`}>
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-line p-4">
                <button
                  type="button"
                  aria-label="Volver a las conversaciones"
                  onClick={() => setSelectedId(null)}
                  className="text-muted hover:text-ink lg:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <span className="tile flex h-10 w-10 items-center justify-center rounded-full font-body text-xs font-semibold">
                  {initials(selected.nombre)}
                </span>
                <div>
                  <p className="font-body text-sm font-semibold text-ink">{selected.nombre}</p>
                  <p className="font-body text-xs text-muted">{selected.rol}</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                {selected.mensajes.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 font-body text-sm ${
                      m.de === 'yo' ? 'self-end bg-cocoa text-on-cocoa' : 'self-start bg-canvas text-ink'
                    }`}
                  >
                    {m.texto}
                    <span className={`mt-1 block text-[10px] ${m.de === 'yo' ? 'opacity-70' : 'text-muted'}`}>{m.hora}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={send} className="flex items-center gap-3 border-t border-line p-4">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escribe un mensaje…"
                  aria-label="Mensaje"
                  className="flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 font-body text-sm text-ink outline-none placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="submit"
                  aria-label="Enviar"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-on-brand transition-opacity hover:opacity-90"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <p className="m-auto p-8 font-body text-sm text-muted">Elige una conversación para verla.</p>
          )}
        </div>
      </div>
    </section>
  )
}
