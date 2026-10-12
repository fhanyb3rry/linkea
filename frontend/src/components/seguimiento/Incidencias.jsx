import { useState } from 'react'
import useAccion from '../../hooks/useAccion'
import { formatDate } from '../../lib/perfil'
import { ROLES } from '../../lib/roles'
import { ESTADO_INCIDENCIA, TIPOS_INCIDENCIA } from '../../lib/seguimiento'
import { crearIncidencia, resolverIncidencia } from '../../services/api'
import { FormRow, Select, TextArea, TextInput } from '../forms/FormField'
import { Boton, ErrorTexto, Pill, Seccion, Vacio } from './ui'

function NuevaIncidencia({ seg, onChange }) {
  const [form, setForm] = useState({ tipo: TIPOS_INCIDENCIA[0], descripcion: '' })
  const { busy, error, run } = useAccion(onChange)

  async function enviar(event) {
    event.preventDefault()
    const ok = await run('nueva', () => crearIncidencia(seg.id, { tipo: form.tipo, descripcion: form.descripcion.trim() }))
    if (ok) setForm((f) => ({ ...f, descripcion: '' }))
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 rounded-xl border border-line p-4">
      <FormRow label="Tipo">
        <Select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
          {TIPOS_INCIDENCIA.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </FormRow>
      <FormRow label="¿Qué pasó? *">
        <TextArea
          rows={3}
          minLength={5}
          maxLength={1500}
          value={form.descripcion}
          onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          placeholder="Describe la situación para que coordinación pueda ayudar."
          required
        />
      </FormRow>
      <ErrorTexto>{error}</ErrorTexto>
      <Boton type="submit" variante="primario" className="w-fit px-5 py-2.5" disabled={busy === 'nueva'}>
        {busy === 'nueva' ? 'Enviando…' : 'Reportar incidencia'}
      </Boton>
    </form>
  )
}

function Fila({ i, seg, usuario, onChange }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const { busy, error, run } = useAccion(onChange)
  const puedeResolver = i.estado === 'abierta' && ['coordinador', 'asesor_academico'].includes(usuario.rol)

  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-body text-sm font-semibold text-ink">{i.tipo}</span>
        <Pill estado={i.estado} mapa={ESTADO_INCIDENCIA} />
        <span className="ml-auto font-body text-xs text-muted">
          {i.reportada_por} ({ROLES[i.rol] ?? i.rol}) · {formatDate(i.fecha)}
        </span>
      </div>
      <p className="whitespace-pre-line font-body text-sm text-muted">{i.descripcion}</p>
      {i.estado === 'resuelta' && (
        <p className="font-body text-xs text-ink">
          <span className="font-semibold">Resolución de {i.resuelta_por}:</span> {i.resolucion}
        </p>
      )}
      {puedeResolver && !abierto && (
        <Boton className="w-fit" onClick={() => setAbierto(true)}>
          Resolver
        </Boton>
      )}
      {abierto && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <TextInput value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Cómo se resolvió?" />
          <Boton
            variante="verde"
            disabled={texto.trim().length < 3 || busy === 'resolver'}
            onClick={() => run('resolver', () => resolverIncidencia(seg.id, i.id, texto.trim()))}
          >
            Guardar
          </Boton>
          <Boton onClick={() => setAbierto(false)}>Cancelar</Boton>
        </div>
      )}
      <ErrorTexto>{error}</ErrorTexto>
    </li>
  )
}

export default function Incidencias({ seg, usuario, onChange }) {
  const ordenadas = [...seg.incidencias].reverse()
  return (
    <Seccion
      title="Incidencias"
      description="Cualquier persona de la estadía puede reportar un problema; coordinación o el asesor académico lo resuelven."
    >
      <NuevaIncidencia seg={seg} onChange={onChange} />
      {ordenadas.length === 0 ? (
        <Vacio>Sin incidencias reportadas.</Vacio>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {ordenadas.map((i) => (
            <Fila key={i.id} i={i} seg={seg} usuario={usuario} onChange={onChange} />
          ))}
        </ul>
      )}
    </Seccion>
  )
}
