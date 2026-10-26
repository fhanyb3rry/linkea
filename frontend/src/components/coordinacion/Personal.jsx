import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../../context/auth'
import useFetch from '../../hooks/useFetch'
import { ROLES } from '../../lib/roles'
import { createPersonal, getUsuarios, setUsuarioActivo } from '../../services/api'
import { faltanEnPassword } from '../../lib/password'
import { FormRow, Select, TextInput } from '../forms/FormField'
import ListState from '../layout/ListState'
import { Boton, ErrorTexto, Seccion } from '../seguimiento/ui'

const VACIO = { nombre: '', email: '', password: '', rol: 'asesor_academico' }

// Cuentas del personal de la universidad: no se registran solas, las da de alta coordinación.
export default function Personal() {
  const { usuario } = useAuth()
  const asesores = useFetch(() => getUsuarios('asesor_academico'), [])
  const coordinadores = useFetch(() => getUsuarios('coordinador'), [])
  const [form, setForm] = useState(VACIO)
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const lista = [...(asesores.data ?? []), ...(coordinadores.data ?? [])]
  const recargar = () => {
    asesores.reload()
    coordinadores.reload()
  }

  async function crear(event) {
    event.preventDefault()
    const faltan = faltanEnPassword(form.password)
    if (faltan.length > 0) {
      setError(`La contraseña necesita: ${faltan.join(', ').toLowerCase()}.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createPersonal({ ...form, nombre: form.nombre.trim(), email: form.email.trim() })
      setForm(VACIO)
      setAbierto(false)
      recargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function alternar(u) {
    setError(null)
    try {
      await setUsuarioActivo(u.id, !u.activo)
      recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const onText = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Seccion
      title="Personal de la universidad"
      description="Asesores académicos y coordinación. Comparte la contraseña inicial con la persona por un medio seguro."
    >
      <ListState loading={asesores.loading || coordinadores.loading} error={asesores.error || coordinadores.error} />
      <ErrorTexto>{error}</ErrorTexto>
      <ul className="flex flex-col divide-y divide-line">
        {lista.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className={`font-body text-sm font-semibold ${u.activo ? 'text-ink' : 'text-muted line-through'}`}>{u.nombre}</p>
              <p className="font-body text-xs text-muted">
                {u.email} · {ROLES[u.rol]}
              </p>
            </div>
            {u.id !== usuario.id && (
              <Boton variante={u.activo ? 'texto' : 'borde'} onClick={() => alternar(u)}>
                {u.activo ? 'Desactivar' : 'Reactivar'}
              </Boton>
            )}
          </li>
        ))}
      </ul>

      {abierto ? (
        <form onSubmit={crear} className="flex flex-col gap-4 rounded-xl border border-line p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow label="Nombre *">
              <TextInput value={form.nombre} onChange={onText('nombre')} required minLength={2} placeholder="Mtra. Laura Sánchez" />
            </FormRow>
            <FormRow label="Correo *">
              <TextInput type="email" value={form.email} onChange={onText('email')} required placeholder="asesor@utvt.edu.mx" />
            </FormRow>
            <FormRow label="Contraseña inicial *">
              <TextInput type="text" value={form.password} onChange={onText('password')} required minLength={10} maxLength={72} autoComplete="off" />
              <p className="mt-1 font-body text-[11px] text-muted">Mínimo 10 caracteres con mayúscula, número y símbolo.</p>
            </FormRow>
            <FormRow label="Rol">
              <Select value={form.rol} onChange={onText('rol')}>
                <option value="asesor_academico">Asesor académico</option>
                <option value="coordinador">Coordinación</option>
              </Select>
            </FormRow>
          </div>
          <div className="flex gap-2">
            <Boton type="submit" variante="primario" disabled={busy}>
              {busy ? 'Creando…' : 'Crear cuenta'}
            </Boton>
            <Boton onClick={() => setAbierto(false)}>Cancelar</Boton>
          </div>
        </form>
      ) : (
        <Boton className="w-fit" onClick={() => setAbierto(true)}>
          <UserPlus className="h-3.5 w-3.5" />
          Dar de alta
        </Boton>
      )}
    </Seccion>
  )
}
