import { useState } from 'react'
import { Building2, CalendarDays, Clock, FileCheck2, GraduationCap, TriangleAlert, UserRound } from 'lucide-react'
import useAccion from '../../hooks/useAccion'
import useFetch from '../../hooks/useFetch'
import { formatDate } from '../../lib/perfil'
import { porcentajeHoras } from '../../lib/seguimiento'
import { asignarAsesor, getUsuarios, updateSeguimiento } from '../../services/api'
import { FormRow, Select, TextInput } from '../forms/FormField'
import { Boton, ErrorTexto, Seccion } from './ui'

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cocoa-soft text-cocoa">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-heading text-2xl text-ink">{value}</p>
        <p className="font-body text-xs text-muted">{label}</p>
      </div>
    </div>
  )
}

function Dato({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
      <div>
        <p className="font-body text-xs text-muted">{label}</p>
        <p className="font-body text-sm text-ink">{children || '—'}</p>
      </div>
    </div>
  )
}

// Controles de coordinación: asesor académico, horas requeridas y cierre de la estadía.
function PanelCoordinacion({ seg, onChange }) {
  const { data: asesores } = useFetch(() => getUsuarios('asesor_academico'), [])
  const [asesor, setAsesor] = useState(seg.asesor_academico_id ?? '')
  const [horas, setHoras] = useState(seg.horas_requeridas)
  const { busy, error, run } = useAccion(onChange)

  return (
    <Seccion title="Coordinación" description="Solo coordinación ve este bloque.">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Asesor académico">
          <div className="flex gap-2">
            <Select value={asesor} onChange={(e) => setAsesor(e.target.value)}>
              <option value="">Sin asignar</option>
              {(asesores ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Select>
            <Boton
              variante="cafe"
              disabled={!asesor || asesor === seg.asesor_academico_id || busy === 'asesor'}
              onClick={() => run('asesor', () => asignarAsesor(seg.id, asesor))}
            >
              Asignar
            </Boton>
          </div>
        </FormRow>
        <FormRow label="Horas requeridas">
          <div className="flex gap-2">
            <TextInput type="number" min="1" max="2000" value={horas} onChange={(e) => setHoras(e.target.value)} />
            <Boton
              variante="cafe"
              disabled={Number(horas) === seg.horas_requeridas || busy === 'horas'}
              onClick={() => run('horas', () => updateSeguimiento(seg.id, { horas_requeridas: Number(horas) }))}
            >
              Guardar
            </Boton>
          </div>
        </FormRow>
      </div>
      <div className="flex flex-wrap gap-2">
        {seg.estado === 'en_curso' ? (
          <>
            <Boton
              variante="verde"
              disabled={busy === 'estado'}
              onClick={() => run('estado', () => updateSeguimiento(seg.id, { estado: 'concluida' }))}
            >
              Concluir estadía
            </Boton>
            <Boton
              variante="texto"
              disabled={busy === 'estado'}
              onClick={() => run('estado', () => updateSeguimiento(seg.id, { estado: 'cancelada' }))}
            >
              Cancelar estadía
            </Boton>
          </>
        ) : (
          <Boton disabled={busy === 'estado'} onClick={() => run('estado', () => updateSeguimiento(seg.id, { estado: 'en_curso' }))}>
            Reabrir estadía
          </Boton>
        )}
      </div>
      <p className="font-body text-xs text-muted">
        Para concluir se necesitan las horas requeridas validadas y todos los documentos completos.
      </p>
      <ErrorTexto>{error}</ErrorTexto>
    </Seccion>
  )
}

export default function Resumen({ seg, usuario, onChange }) {
  const pct = porcentajeHoras(seg)
  return (
    <div className="flex flex-col gap-6">
      <section className="panel p-6">
        <div className="flex items-end justify-between gap-4 font-body">
          <div>
            <p className="text-xs text-muted">Horas validadas</p>
            <p className="font-heading text-3xl text-ink">
              {seg.horas_validadas} <span className="text-lg text-muted">/ {seg.horas_requeridas} h</span>
            </p>
          </div>
          <p className="text-sm font-semibold text-ink">{pct}%</p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-gradient-to-r from-cocoa to-caramel" style={{ width: `${pct}%` }} />
        </div>
        {seg.horas_pendientes > 0 && (
          <p className="mt-2 font-body text-xs text-muted">{seg.horas_pendientes} h más esperan validación de la empresa.</p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Clock} label="Bitácoras" value={seg.bitacoras.length} />
        <Stat icon={FileCheck2} label="Documentos completos" value={`${seg.documentos_completos}/${seg.documentos.length}`} />
        <Stat icon={CalendarDays} label="Reportes" value={seg.reportes.length} />
        <Stat icon={TriangleAlert} label="Incidencias abiertas" value={seg.incidencias_abiertas} />
      </div>

      <Seccion title="Datos de la estadía">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Dato icon={GraduationCap} label="Estudiante">
            {seg.estudiante_nombre}
            {seg.matricula && ` · ${seg.matricula}`}
          </Dato>
          <Dato icon={GraduationCap} label="Carrera">
            {seg.carrera}
          </Dato>
          <Dato icon={Building2} label="Organización y puesto">
            {seg.organizacion_nombre}
            {seg.vacante_titulo && ` · ${seg.vacante_titulo}`}
          </Dato>
          <Dato icon={UserRound} label="Asesor académico">
            {seg.asesor_academico_nombre || 'Por asignar'}
          </Dato>
          <Dato icon={UserRound} label="Asesor empresarial">
            {seg.asesor_empresarial}
          </Dato>
          <Dato icon={CalendarDays} label="Inicio">
            {formatDate(seg.fecha_inicio)}
          </Dato>
        </div>
      </Seccion>

      {usuario.rol === 'coordinador' && <PanelCoordinacion key={seg.id} seg={seg} onChange={onChange} />}
    </div>
  )
}
