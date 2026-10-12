import { Link, useParams } from 'react-router-dom'
import {
  Calendar,
  Check,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from 'lucide-react'
import ListState from '../components/layout/ListState'
import PageTitle from '../components/layout/PageTitle'
import useActiveStudent from '../hooks/useActiveStudent'
import useFetch from '../hooks/useFetch'
import useStoredSet from '../hooks/useStoredSet'
import { formatDate, formatSize, initials, perfilCompleto } from '../lib/perfil'
import { descargarCV, getStudent } from '../services/api'

const estados = {
  activo: { label: 'Disponible', dot: 'bg-teal' },
  en_proceso: { label: 'En proceso', dot: 'bg-accent' },
  colocado: { label: 'Colocado', dot: 'bg-muted' },
}

function Card({ title, children, className = '' }) {
  return (
    <section className={`panel p-6 ${className}`}>
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Chips({ items, empty }) {
  if (!items?.length) return <p className="font-body text-sm text-muted">{empty}</p>
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-line bg-canvas px-3 py-1 font-body text-xs text-ink">
          {item}
        </span>
      ))}
    </div>
  )
}

function Dato({ icon: Icon, children }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-cocoa" />
      {children}
    </span>
  )
}

export default function PerfilEstudiante() {
  const { id } = useParams()
  const [activeId] = useActiveStudent()
  const [connections, toggleConnection] = useStoredSet('linkea-connections')
  const { data: student, error, loading } = useFetch(() => getStudent(id), [id])

  const isMine = activeId === id
  const enlaces = student
    ? [
        ['LinkedIn', student.enlaces?.linkedin],
        ['GitHub', student.enlaces?.github],
        ['Portafolio', student.enlaces?.portafolio],
      ].filter(([, url]) => url)
    : []
  const connected = connections.has(id)

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageTitle title={student ? 'Perfil' : 'Perfil de estudiante'} back={{ to: '/estudiantes', label: 'Estudiantes' }} />

      <ListState loading={loading} error={error} />

      {student && (
        <>
          <header className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
            <span className="tile flex h-24 w-24 shrink-0 items-center justify-center rounded-full font-heading text-3xl font-semibold">
              {initials(student.nombre)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-medium">{student.nombre}</h2>
                <span className="flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 font-body text-xs text-muted">
                  <span className={`h-2 w-2 rounded-full ${(estados[student.estado] ?? estados.colocado).dot}`} />
                  {(estados[student.estado] ?? { label: student.estado }).label}
                </span>
                {isMine && (
                  <span className="rounded-full bg-cocoa-soft px-3 py-1 font-body text-xs font-medium text-cocoa">
                    Tu perfil
                  </span>
                )}
              </div>
              <p className="mt-1 font-body text-sm text-muted">
                {student.carrera} · {student.semestre}º semestre
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-body text-xs text-muted">
                <Dato icon={MapPin}>{student.ubicacion.zona}</Dato>
                <Dato icon={Clock}>{student.disponibilidad.horas_por_semana} hrs/semana</Dato>
                {student.correo && <Dato icon={Mail}>{student.correo}</Dato>}
                {student.telefono && <Dato icon={Phone}>{student.telefono}</Dato>}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 sm:flex-col">
              {isMine ? (
                <Link
                  to="/perfil/editar"
                  className="flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
                >
                  <Pencil className="h-4 w-4" />
                  Editar perfil
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    aria-pressed={connected}
                    onClick={() => toggleConnection(id)}
                    className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-body text-sm font-semibold transition-opacity ${
                      connected
                        ? 'border border-cocoa bg-cocoa-soft text-cocoa'
                        : 'bg-cocoa text-on-cocoa hover:opacity-90'
                    }`}
                  >
                    {connected && <Check className="h-4 w-4" />}
                    {connected ? 'Conectado' : 'Conectar'}
                  </button>
                </>
              )}
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
            <div className="flex flex-col gap-6">
              <Card title="Sobre mí">
                <p className="whitespace-pre-line font-body text-sm leading-relaxed text-muted">
                  {student.bio || 'Aún no ha escrito una presentación.'}
                </p>
              </Card>

              <Card title="Habilidades">
                <Chips items={student.skills} empty="Aún no ha agregado habilidades." />
              </Card>

              <div className="grid gap-6 sm:grid-cols-2">
                <Card title="Idiomas">
                  <Chips items={student.idiomas} empty="Sin idiomas registrados." />
                </Card>
                <Card title="Disponibilidad">
                  <p className="flex items-center gap-2 font-body text-sm text-ink">
                    <Clock className="h-4 w-4 text-cocoa" />
                    {student.disponibilidad.horas_por_semana} horas por semana
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-cocoa" />
                    <Chips items={student.disponibilidad.dias} empty="Días no especificados." />
                  </div>
                </Card>
              </div>

              <Card title="Enlaces">
                {enlaces.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {enlaces.map(([label, url]) => (
                        <li key={label}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex items-center gap-2 font-body text-sm text-ink hover:text-brand"
                          >
                            <Globe className="h-4 w-4 text-cocoa" />
                            {label}
                            <ExternalLink className="h-3 w-3 text-muted" />
                          </a>
                        </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-body text-sm text-muted">Sin enlaces.</p>
                )}
              </Card>
            </div>

            <aside className="flex flex-col gap-6">
              <Card title="Currículum">
                {student.cv ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cocoa-soft text-cocoa">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-body text-sm font-semibold text-ink">{student.cv.nombre_archivo}</p>
                        <p className="font-body text-xs text-muted">
                          {formatSize(student.cv.tamano)} · {formatDate(student.cv.subido_en)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => descargarCV(student.id, student.cv.nombre_archivo)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-cocoa px-4 py-2.5 font-body text-sm font-semibold text-on-cocoa transition-opacity hover:opacity-90"
                    >
                      <Download className="h-4 w-4" />
                      Descargar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-3">
                    <p className="font-body text-sm text-muted">Aún no ha subido su currículum.</p>
                    {isMine && (
                      <Link to="/perfil/editar" className="font-body text-sm font-semibold text-brand hover:underline">
                        Subir mi CV
                      </Link>
                    )}
                  </div>
                )}
              </Card>

              {isMine && <Completitud student={student} />}
            </aside>
          </div>
        </>
      )}
    </section>
  )
}

function Completitud({ student }) {
  const { pct, items } = perfilCompleto(student)
  return (
    <Card title="Completitud del perfil">
      <div className="flex items-center justify-between font-body text-xs">
        <span className="text-muted">Avance</span>
        <span className="font-semibold text-ink">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gradient-to-r from-cocoa to-caramel" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {items.map(({ label, ok }) => (
          <li key={label} className="flex items-center gap-2 font-body text-xs text-ink">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                ok ? 'bg-teal text-white' : 'border border-line text-transparent'
              }`}
            >
              <Check className="h-2.5 w-2.5" />
            </span>
            <span className={ok ? '' : 'text-muted'}>{label}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
