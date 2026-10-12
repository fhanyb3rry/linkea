import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import useFetch from '../../hooks/useFetch'
import { FIRMANTES } from '../../lib/seguimiento'
import {
  createDocumentoCatalogo,
  deleteDocumentoCatalogo,
  getCatalogoDocumentos,
  updateDocumentoCatalogo,
} from '../../services/api'
import { FormRow, TextInput } from '../forms/FormField'
import ListState from '../layout/ListState'
import { Boton, ErrorTexto, Seccion } from '../seguimiento/ui'

const VACIO = { nombre: '', descripcion: '', requiere: ['academico'], orden: 0, activo: true }

function Formulario({ inicial, onGuardar, onCancelar }) {
  const [form, setForm] = useState(inicial)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function toggleFirmante(f) {
    setForm((prev) => ({
      ...prev,
      requiere: prev.requiere.includes(f) ? prev.requiere.filter((x) => x !== f) : [...prev.requiere, f],
    }))
  }

  async function enviar(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onGuardar({ ...form, nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), orden: Number(form.orden) })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 rounded-xl border border-line p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
        <FormRow label="Nombre del documento *">
          <TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required minLength={3} maxLength={120} placeholder="Carta de aceptación" />
        </FormRow>
        <FormRow label="Orden">
          <TextInput type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} />
        </FormRow>
      </div>
      <FormRow label="Descripción">
        <TextInput value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} maxLength={400} placeholder="¿Para qué sirve?" />
      </FormRow>
      <div className="flex flex-wrap gap-5 font-body text-sm text-ink">
        <span className="text-muted">Lo firma:</span>
        {Object.entries(FIRMANTES).map(([f, label]) => (
          <label key={f} className="flex items-center gap-2">
            <input type="checkbox" checked={form.requiere.includes(f)} onChange={() => toggleFirmante(f)} className="h-4 w-4 accent-[var(--cocoa)]" />
            {label}
          </label>
        ))}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="h-4 w-4 accent-[var(--cocoa)]" />
          Activo
        </label>
      </div>
      <ErrorTexto>{error}</ErrorTexto>
      <div className="flex gap-2">
        <Boton type="submit" variante="primario" disabled={busy || form.requiere.length === 0}>
          Guardar
        </Boton>
        <Boton onClick={onCancelar}>Cancelar</Boton>
      </div>
    </form>
  )
}

export default function CatalogoDocumentos() {
  const { data, error, loading, reload } = useFetch(() => getCatalogoDocumentos(), [])
  const [editando, setEditando] = useState(null) // id, 'nuevo' o null
  const [accionError, setAccionError] = useState(null)

  async function guardar(payload) {
    if (editando === 'nuevo') await createDocumentoCatalogo(payload)
    else await updateDocumentoCatalogo(editando, payload)
    setEditando(null)
    reload()
  }

  async function borrar(id) {
    setAccionError(null)
    try {
      await deleteDocumentoCatalogo(id)
      reload()
    } catch (err) {
      setAccionError(err.message)
    }
  }

  return (
    <Seccion
      title="Catálogo de documentos"
      description="Los documentos activos se copian a cada estadía nueva al asignarse. Cambiarlos aquí no altera las estadías que ya empezaron."
    >
      <ListState loading={loading} error={error} />
      <ErrorTexto>{accionError}</ErrorTexto>
      <ul className="flex flex-col divide-y divide-line">
        {(data ?? []).map((d) =>
          editando === d.id ? (
            <li key={d.id} className="py-3">
              <Formulario inicial={d} onGuardar={guardar} onCancelar={() => setEditando(null)} />
            </li>
          ) : (
            <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm font-semibold text-ink">
                  {d.nombre}
                  {!d.activo && <span className="ml-2 font-normal text-muted">(inactivo)</span>}
                </p>
                <p className="font-body text-xs text-muted">
                  Firma: {d.requiere.map((f) => FIRMANTES[f]).join(' y ')}
                  {d.descripcion && ` · ${d.descripcion}`}
                </p>
              </div>
              <Boton aria-label={`Editar ${d.nombre}`} onClick={() => setEditando(d.id)}>
                <Pencil className="h-3.5 w-3.5" />
              </Boton>
              <Boton variante="texto" aria-label={`Borrar ${d.nombre}`} onClick={() => borrar(d.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Boton>
            </li>
          ),
        )}
      </ul>
      {editando === 'nuevo' ? (
        <Formulario inicial={VACIO} onGuardar={guardar} onCancelar={() => setEditando(null)} />
      ) : (
        <Boton className="w-fit" onClick={() => setEditando('nuevo')}>
          <Plus className="h-3.5 w-3.5" />
          Agregar documento
        </Boton>
      )}
    </Seccion>
  )
}
