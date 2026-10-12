import { useRef, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import useAccion from '../../hooks/useAccion'
import { formatDate } from '../../lib/perfil'
import { crearReporte, descargarReporte } from '../../services/api'
import { FormRow, TextArea, TextInput } from '../forms/FormField'
import { Boton, ErrorTexto, Seccion, Vacio } from './ui'

const VACIO = { titulo: '', periodo: '', contenido: '' }

function NuevoReporte({ seg, onChange }) {
  const [form, setForm] = useState(VACIO)
  const [archivo, setArchivo] = useState(null)
  const inputRef = useRef(null)
  const { busy, error, run } = useAccion(onChange)
  const onText = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function enviar(event) {
    event.preventDefault()
    const ok = await run('nuevo', () => crearReporte(seg.id, { ...form, archivo }))
    if (ok) {
      setForm(VACIO)
      setArchivo(null)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 rounded-xl border border-line p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label="Título *">
          <TextInput value={form.titulo} onChange={onText('titulo')} placeholder="Reporte mensual" required minLength={3} maxLength={120} />
        </FormRow>
        <FormRow label="Periodo">
          <TextInput value={form.periodo} onChange={onText('periodo')} placeholder="Septiembre 2026" maxLength={60} />
        </FormRow>
      </div>
      <FormRow label="Contenido">
        <TextArea
          rows={4}
          maxLength={3000}
          value={form.contenido}
          onChange={onText('contenido')}
          placeholder="Avances, logros y pendientes del periodo (o adjunta el PDF)."
        />
      </FormRow>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
        <Boton onClick={() => inputRef.current?.click()}>
          <FileText className="h-3.5 w-3.5" />
          {archivo ? archivo.name : 'Adjuntar PDF (opcional)'}
        </Boton>
        {archivo && (
          <Boton variante="texto" onClick={() => setArchivo(null)}>
            Quitar
          </Boton>
        )}
      </div>
      <ErrorTexto>{error}</ErrorTexto>
      <Boton type="submit" variante="primario" className="w-fit px-5 py-2.5" disabled={busy === 'nuevo'}>
        {busy === 'nuevo' ? 'Enviando…' : 'Entregar reporte'}
      </Boton>
    </form>
  )
}

export default function Reportes({ seg, usuario, onChange }) {
  const { error, run } = useAccion(onChange)
  const ordenados = [...seg.reportes].reverse()

  return (
    <Seccion title="Reportes" description="Reportes de avance que entrega el estudiante durante la estadía.">
      {usuario.rol === 'estudiante' && seg.estado === 'en_curso' && <NuevoReporte seg={seg} onChange={onChange} />}
      <ErrorTexto>{error}</ErrorTexto>
      {ordenados.length === 0 ? (
        <Vacio>Aún no hay reportes entregados.</Vacio>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {ordenados.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-body text-sm font-semibold text-ink">{r.titulo}</span>
                {r.periodo && <span className="font-body text-xs text-muted">{r.periodo}</span>}
                <span className="ml-auto font-body text-xs text-muted">{formatDate(r.fecha)}</span>
              </div>
              {r.contenido && <p className="whitespace-pre-line font-body text-sm text-muted">{r.contenido}</p>}
              {r.archivo && (
                <Boton className="w-fit" onClick={() => run('descargar', () => descargarReporte(seg.id, r))}>
                  <Download className="h-3.5 w-3.5" />
                  {r.archivo.nombre}
                </Boton>
              )}
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  )
}
