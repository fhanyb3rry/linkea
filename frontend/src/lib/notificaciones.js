import { getApplications, getStudents, getVacancies } from '../services/api'
import { ESTADOS } from './estados'

// Las notificaciones se derivan de las postulaciones reales: cada cambio de estado
// en el historial genera un aviso (la API ya filtra lo que cada rol puede ver).
// No hay servicio de push: el "leído" se guarda en este navegador.

const KEY = 'linkea-notif-leidas'
export const MAX_NOTIF = 20

const TITULO_ESTADO = {
  enviada: 'Postulación enviada',
  en_revision: 'Tu postulación está en revisión',
  aceptada: '¡Te aceptaron!',
  asignada: 'Te asignaron una estadía',
  rechazada: 'No seleccionada esta vez',
}

export function leidasGuardadas() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

export function guardarLeidas(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {
    // sin almacenamiento: lo leído dura solo la sesión
  }
}

export function hace(iso) {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const h = Math.round(mins / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'Ayer' : `Hace ${d} días`
}

const ultimo = (a) => a.historial?.[a.historial.length - 1] ?? { estado: a.estado, fecha: a.creada_en, por: '', nota: '' }

// Construye la lista de avisos según el rol; devuelve [] si el backend no responde.
export async function cargarNotificaciones(rol, activeStudent) {
  const [apps, vacs, studs] = await Promise.all([
    getApplications(),
    getVacancies(),
    rol === 'estudiante' ? Promise.resolve([]) : getStudents(),
  ])
  const vacante = new Map(vacs.map((v) => [v.id, v.titulo || v.nombre_empresa]))
  const alumno = new Map(studs.map((s) => [s.id, s.nombre]))

  let lista
  if (rol === 'estudiante') {
    lista = apps.map((a) => {
      const u = ultimo(a)
      return {
        id: `${a.id}:${u.estado}:${u.fecha}`,
        fecha: u.fecha,
        tipo: 'postulacion',
        titulo: TITULO_ESTADO[u.estado] ?? 'Tu postulación cambió',
        texto: `${vacante.get(a.vacancy_id) ?? 'Una vacante'} · por ${u.por || 'la empresa'}${u.nota ? ` — “${u.nota}”` : ''}`,
        to: '/postulaciones',
      }
    })
    if (!activeStudent) {
      lista.unshift({
        id: 'sin-perfil',
        fecha: null,
        tipo: 'sistema',
        titulo: 'Crea tu perfil de estudiante',
        texto: 'Sin perfil no puedes postularte ni aparecer en las sugerencias de las empresas.',
        to: '/perfil/crear',
      })
    }
  } else {
    const esNueva = (u) => u.estado === 'enviada'
    lista = apps.map((a) => {
      const u = ultimo(a)
      return {
        id: `${a.id}:${u.estado}:${u.fecha}`,
        fecha: u.fecha,
        tipo: esNueva(u) ? 'postulante' : 'postulacion',
        titulo: esNueva(u) ? 'Nueva postulación' : `Postulación ${(ESTADOS[u.estado]?.label ?? u.estado).toLowerCase()}`,
        texto: `${alumno.get(a.student_id) ?? 'Un estudiante'} · ${vacante.get(a.vacancy_id) ?? 'tu vacante'}`,
        to: rol === 'empresa' ? `/vacantes/${a.vacancy_id}/candidatos` : rol === 'coordinador' ? '/coordinacion' : '/seguimientos',
      }
    })
  }

  lista.sort((a, b) => new Date(b.fecha ?? 0) - new Date(a.fecha ?? 0))
  return lista.slice(0, MAX_NOTIF)
}

// Avisa al resto de la app (la campana de la barra superior) cuántas hay sin leer.
export function avisarSinLeer(n) {
  window.dispatchEvent(new CustomEvent('linkea-notif', { detail: { sinLeer: n } }))
}
