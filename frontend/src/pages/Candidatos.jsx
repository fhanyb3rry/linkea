import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeCheck, Check, Download, Eye, X } from 'lucide-react'
import EstadoBadge from '../components/cards/EstadoBadge'
import HistorialPostulacion from '../components/cards/HistorialPostulacion'
import MatchBadge from '../components/cards/MatchBadge'
import ListState from '../components/layout/ListState'
import PageTitle from '../components/layout/PageTitle'
import useFetch from '../hooks/useFetch'
import { TRANSICIONES } from '../lib/estados'
import { formatDate, initials } from '../lib/perfil'
import {
  descargarCV,
  getApplications,
  getCandidates,
  getStudents,
  getVacancy,
  updateApplication,
} from '../services/api'

// Botón para llevar una postulación a cada estado.
const ACCIONES = {
  en_revision: { label: 'Marcar en revisión', className: 'border border-line bg-surface text-ink hover:border-cocoa/50' },
  aceptada: { label: 'Aceptar', icon: Check, className: 'bg-cocoa text-on-cocoa hover:opacity-90' },
  asignada: { label: 'Asignar estadía', icon: BadgeCheck, className: 'bg-teal text-on-teal hover:opacity-90' },
  rechazada: { label: 'Rechazar', icon: X, className: 'text-muted hover:text-brand' },
}

function Avatar({ name }) {
  return (
    <span className="tile flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-body text-sm font-semibold">
      {initials(name)}
    </span>
  )
}

export default function Candidatos() {
  const { id } = useParams()
  const [actionError, setActionError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const { data, error, loading, reload } = useFetch(
    () => Promise.all([getVacancy(id), getApplications({ vacancyId: id }), getCandidates(id), getStudents()]),
    [id],
  )
  const [vacancy, applications, candidates, students] = data ?? [null, [], [], []]

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])
  const matchById = useMemo(() => new Map(candidates.map((c) => [c.estudiante_id, c])), [candidates])
  const applied = useMemo(() => new Set(applications.map((a) => a.student_id)), [applications])
  const sugeridos = candidates.filter((c) => !applied.has(c.estudiante_id)).slice(0, 6)

  async function cambiarEstado(applicationId, estado) {
    setBusyId(applicationId)
    setActionError(null)
    try {
      await updateApplication(applicationId, estado)
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageTitle
        title={vacancy ? `Candidatos · ${vacancy.titulo || vacancy.nombre_empresa}` : 'Candidatos'}
        subtitle="Revisa las postulaciones recibidas y descubre estudiantes elegibles que aún no se han postulado."
        back={{ to: '/empresa', label: 'Mi empresa' }}
      />

      <ListState loading={loading} error={error} />
      {actionError && <p className="font-body text-sm text-red-600">{actionError}</p>}

      {vacancy && (
        <>
          <div>
            <h2 className="text-2xl">Postulaciones recibidas ({applications.length})</h2>
            {applications.length === 0 ? (
              <p className="panel mt-4 p-8 text-center font-body text-sm text-muted">
                Todavía nadie se ha postulado. Mientras tanto, mira los candidatos sugeridos abajo.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-4">
                {applications.map((a) => {
                  const student = studentById.get(a.student_id)
                  if (!student) return null
                  const busy = busyId === a.id
                  return (
                    <li key={a.id} className="card flex flex-col gap-4 p-5">
                      <div className="flex flex-wrap items-center gap-4">
                        <Avatar name={student.nombre} />
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/estudiantes/${student.id}`}
                            className="font-body text-base font-semibold text-ink hover:text-brand"
                          >
                            {student.nombre}
                          </Link>
                          <p className="font-body text-xs text-muted">
                            {student.carrera} · {student.semestre}º semestre · {student.ubicacion.zona}
                          </p>
                        </div>
                        <MatchBadge match={matchById.get(student.id)} />
                        <EstadoBadge estado={a.estado} />
                      </div>

                      {a.mensaje && (
                        <p className="rounded-xl bg-canvas p-3 font-body text-xs italic leading-relaxed text-muted">
                          “{a.mensaje}”
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-auto font-body text-xs text-muted">Recibida el {formatDate(a.creada_en)}</span>
                        <Link
                          to={`/estudiantes/${student.id}`}
                          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 font-body text-xs font-semibold text-ink hover:border-cocoa/50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver perfil
                        </Link>
                        {student.cv && (
                          <button
                            type="button"
                            onClick={() => descargarCV(student.id, student.cv.nombre_archivo)}
                            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 font-body text-xs font-semibold text-ink hover:border-cocoa/50"
                          >
                            <Download className="h-3.5 w-3.5" />
                            CV
                          </button>
                        )}
                        {TRANSICIONES[a.estado].map((destino) => {
                          const accion = ACCIONES[destino]
                          return (
                            <button
                              key={destino}
                              type="button"
                              disabled={busy}
                              onClick={() => cambiarEstado(a.id, destino)}
                              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-body text-xs font-semibold disabled:opacity-60 ${accion.className}`}
                            >
                              {accion.icon && <accion.icon className="h-3.5 w-3.5" />}
                              {accion.label}
                            </button>
                          )
                        })}
                      </div>
                      <HistorialPostulacion historial={a.historial} />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-2xl">Candidatos sugeridos</h2>
            <p className="mt-1 font-body text-sm text-muted">
              Estudiantes que aún no se postulan, ordenados por elegibilidad y compatibilidad.
            </p>
            {sugeridos.length === 0 ? (
              <p className="panel mt-4 p-8 text-center font-body text-sm text-muted">
                No hay más estudiantes para sugerir por ahora.
              </p>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {sugeridos.map((c) => {
                  const student = studentById.get(c.estudiante_id)
                  return (
                    <li key={c.estudiante_id} className="card flex items-center gap-4 p-4">
                      <Avatar name={c.nombre} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm font-semibold text-ink">{c.nombre}</p>
                        <p className="truncate font-body text-xs text-muted">
                          {student ? `${student.carrera} · ${student.ubicacion.zona}` : ''}
                        </p>
                      </div>
                      <MatchBadge match={c} />
                      <Link
                        to={`/estudiantes/${c.estudiante_id}`}
                        className="rounded-lg border border-line bg-surface px-3 py-2 font-body text-xs font-semibold text-ink hover:border-cocoa/50"
                      >
                        Ver
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
