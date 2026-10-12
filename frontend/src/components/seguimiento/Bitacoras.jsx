import { useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import useAccion from '../../hooks/useAccion'
import { formatDate } from '../../lib/perfil'
import { ESTADO_BITACORA, hoy } from '../../lib/seguimiento'
import { borrarBitacora, crearBitacora, revisarBitacora } from '../../services/api'
import { FormRow, TextArea, TextInput } from '../forms/FormField'
import { Boton, ErrorTexto, Pill, Seccion, Vacio } from './ui'

function NuevaBitacora({ seg, onChange }) {
  const [form, setForm] = useState({ fecha: hoy(), horas: '', actividades: '' })
  const { busy, error, run } = useAccion(onChange)
  const onText = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function enviar(event) {
    event.preventDefault()
    const ok = await run('nueva', () =>
      crearBitacora(seg.id, { fecha: form.fecha, horas: Number(form.horas), actividades: form.actividades.trim() }),
    )
    if (ok) setForm({ fecha: hoy(), horas: '', actividades: '' })
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 rounded-xl border border-line p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label="Fecha *">
          <TextInput type="date" value={form.fecha} max={hoy()} onChange={onText('fecha')} required />
        </FormRow>
        <FormRow label="Horas trabajadas *">
          <TextInput type="number" min="0.5" max="60" step="0.5" value={form.horas} onChange={onText('horas')} placeholder="8" required />
        </FormRow>
      </div>
      <FormRow label="Actividades realizadas *">
        <TextArea
          rows={3}
          minLength={5}
          maxLength={1500}
          value={form.actividades}
          onChange={onText('actividades')}
          placeholder="¿Qué hiciste hoy? ¿Qué aprendiste?"
          required
        />
      </FormRow>
      <ErrorTexto>{error}</ErrorTexto>
      <Boton type="submit" variante="primario" className="w-fit px-5 py-2.5" disabled={busy === 'nueva'}>
        {busy === 'nueva' ? 'Guardando…' : 'Registrar bitácora'}
      </Boton>
    </form>
  )
}

function Fila({ b, seg, usuario, onChange }) {
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const { busy, error, run } = useAccion(onChange)
  const enCurso = seg.estado === 'en_curso'
  const puedeRevisar = usuario.rol === 'empresa' && b.estado === 'pendiente'
  const puedeBorrar = usuario.rol === 'estudiante' && enCurso && b.estado !== 'validada'

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-body text-sm font-semibold text-ink">{formatDate(b.fecha)}</span>
        <span className="font-body text-xs text-muted">{b.horas} h</span>
        <Pill estado={b.estado} mapa={ESTADO_BITACORA} />
        <div className="ml-auto flex gap-2">
          {puedeRevisar && !rechazando && (
            <>
              <Boton variante="verde" disabled={Boolean(busy)} onClick={() => run('validar', () => revisarBitacora(seg.id, b.id, 'validada'))}>
                <Check className="h-3.5 w-3.5" />
                Validar
              </Boton>
              <Boton variante="texto" onClick={() => setRechazando(true)}>
                <X className="h-3.5 w-3.5" />
                Rechazar
              </Boton>
            </>
          )}
          {puedeBorrar && (
            <Boton
              variante="texto"
              aria-label="Borrar bitácora"
              disabled={Boolean(busy)}
              onClick={() => run('borrar', () => borrarBitacora(seg.id, b.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Boton>
          )}
        </div>
      </div>
      <p className="whitespace-pre-line font-body text-sm text-muted">{b.actividades}</p>
      {b.revisada_por && (
        <p className="font-body text-xs text-muted">
          Revisada por {b.revisada_por}
          {b.observacion && `: “${b.observacion}”`}
        </p>
      )}
      {rechazando && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <TextInput value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo del rechazo" />
          <Boton
            variante="primario"
            disabled={!motivo.trim() || Boolean(busy)}
            onClick={() => run('rechazar', () => revisarBitacora(seg.id, b.id, 'rechazada', motivo.trim()))}
          >
            Rechazar
          </Boton>
          <Boton onClick={() => setRechazando(false)}>Cancelar</Boton>
        </div>
      )}
      <ErrorTexto>{error}</ErrorTexto>
    </li>
  )
}

export default function Bitacoras({ seg, usuario, onChange }) {
  const ordenadas = [...seg.bitacoras].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const descripcion =
    usuario.rol === 'empresa'
      ? 'Valida las horas que registra el estudiante: solo las validadas cuentan para su estadía.'
      : 'Registra tus horas y actividades; la empresa las valida.'

  return (
    <Seccion title="Bitácoras" description={descripcion}>
      {usuario.rol === 'estudiante' && seg.estado === 'en_curso' && <NuevaBitacora seg={seg} onChange={onChange} />}
      {ordenadas.length === 0 ? (
        <Vacio>Aún no hay bitácoras registradas.</Vacio>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {ordenadas.map((b) => (
            <Fila key={b.id} b={b} seg={seg} usuario={usuario} onChange={onChange} />
          ))}
        </ul>
      )}
    </Seccion>
  )
}
