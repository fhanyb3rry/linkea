import { getToken, setToken } from '../lib/session'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// Toda petición lleva el token de la sesión. Si el backend responde 401 (sesión vencida o
// inválida) se borra el token y la app regresa al login.
async function send(path, options = {}) {
  const token = getToken()
  const headers = { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (response.status === 401 && token) setToken('')
  return response
}

async function request(path, options) {
  const response = await send(path, options)
  if (!response.ok) {
    // El backend manda mensajes claros en `detail` (p. ej. "Ya te postulaste a esta vacante")
    let detail = ''
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') detail = body.detail
      // Errores de validación (422): FastAPI manda una lista; mostramos el primero.
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) detail = body.detail[0].msg.replace(/^Value error, /, '')
    } catch {
      // la respuesta no era JSON
    }
    throw new Error(detail || `Error ${response.status} al consultar ${path}`)
  }
  if (response.status === 204) return null
  return response.json()
}

function postJSON(path, body) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---- Cuentas -----------------------------------------------------------------------------

export function login(email, password) {
  return postJSON('/auth/login', { email, password })
}

// rol: 'estudiante' | 'empresa'
export function register({ nombre, email, password, rol }) {
  return postJSON('/auth/register', { nombre, email, password, rol })
}

export function getMe() {
  return request('/auth/me')
}

// organizacionId opcional: solo las vacantes de esa organización
export function getVacancies(organizacionId) {
  return request(`/vacancies${organizacionId ? `?organizacion_id=${organizacionId}` : ''}`)
}

export function getVacancy(id) {
  return request(`/vacancies/${id}`)
}

export function createVacancy(payload) {
  return postJSON('/vacancies', payload)
}

export function getStudents() {
  return request('/students')
}

export function createStudent(payload) {
  return postJSON('/students', payload)
}

export function getCompatibilidadIA(studentId, vacancyId, refrescar = false) {
  return request(`/ai/compatibility/${studentId}/${vacancyId}${refrescar ? '?refrescar=true' : ''}`)
}

export function checkEligibility(studentId, vacancyId) {
  return request(`/eligibility/check/${studentId}/${vacancyId}`)
}

// Recomendaciones del agente para un estudiante: vacantes con elegibilidad y compatibilidad (0-100).
export function getRecommendations(studentId) {
  return request(`/agent/recommend/${studentId}`)
}

// Candidatos de una vacante: estudiantes con elegibilidad y compatibilidad (0-100).
export function getCandidates(vacancyId) {
  return request(`/agent/candidates/${vacancyId}`)
}

function sendJSON(method, path, body) {
  return request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---- Estudiantes -------------------------------------------------------------------------

export function getStudent(id) {
  return request(`/students/${id}`)
}

export function updateStudent(id, payload) {
  return sendJSON('PUT', `/students/${id}`, payload)
}

export function deleteStudent(id) {
  return request(`/students/${id}`, { method: 'DELETE' })
}

// Currículum (PDF, DOC o DOCX, máx. 5 MB)
export function uploadCV(studentId, file) {
  const body = new FormData()
  body.append('file', file)
  return request(`/students/${studentId}/cv`, { method: 'POST', body })
}

export function deleteCV(studentId) {
  return request(`/students/${studentId}/cv`, { method: 'DELETE' })
}

// Descarga un archivo con la sesión (un <a href> normal no manda el token).
async function descargar(path, nombre) {
  const response = await send(path)
  if (!response.ok) throw new Error('No se pudo descargar el archivo')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = nombre
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function descargarCV(studentId, nombre = 'curriculum') {
  return descargar(`/students/${studentId}/cv`, nombre)
}

// ---- Vacantes ----------------------------------------------------------------------------

export function updateVacancy(id, payload) {
  return sendJSON('PUT', `/vacancies/${id}`, payload)
}

export function deleteVacancy(id) {
  return request(`/vacancies/${id}`, { method: 'DELETE' })
}

// ---- Organizaciones ----------------------------------------------------------------------

export function getOrganizations() {
  return request('/organizations')
}

export function getOrganization(id) {
  return request(`/organizations/${id}`)
}

export function createOrganization(payload) {
  return postJSON('/organizations', payload)
}

export function updateOrganization(id, payload) {
  return sendJSON('PUT', `/organizations/${id}`, payload)
}

// ---- Postulaciones -----------------------------------------------------------------------

// filtros opcionales: { studentId, vacancyId }
export function getApplications({ studentId, vacancyId } = {}) {
  const params = new URLSearchParams()
  if (studentId) params.set('student_id', studentId)
  if (vacancyId) params.set('vacancy_id', vacancyId)
  const query = params.toString()
  return request(`/applications${query ? `?${query}` : ''}`)
}

export function createApplication(studentId, vacancyId, mensaje = '') {
  return postJSON('/applications', { student_id: studentId, vacancy_id: vacancyId, mensaje })
}

export function updateApplication(id, estado) {
  return sendJSON('PATCH', `/applications/${id}`, { estado })
}

export function deleteApplication(id) {
  return request(`/applications/${id}`, { method: 'DELETE' })
}

// Búsqueda DFS/BFS sobre el grafo de habilidades
export function getGrafoSkills() {
  return request('/search/grafo')
}

export function buscarRutas({ desde, hasta, algoritmo, limite }) {
  const params = new URLSearchParams({ desde, hasta, algoritmo, limite })
  return request(`/search/rutas?${params}`)
}

export function getPlanAprendizaje(studentId, vacancyId, limite) {
  return request(`/search/aprendizaje/${studentId}/${vacancyId}?limite=${limite}`)
}

// ---- Seguimiento de la estadía -----------------------------------------------------------
// Cada acción devuelve el seguimiento completo ya actualizado (con sus totales).

export function getSeguimientos(estado) {
  return request(`/seguimientos${estado ? `?estado=${estado}` : ''}`)
}

export function getSeguimiento(id) {
  return request(`/seguimientos/${id}`)
}

export function updateSeguimiento(id, cambios) {
  return sendJSON('PATCH', `/seguimientos/${id}`, cambios)
}

export function asignarAsesor(id, asesorId) {
  return sendJSON('PUT', `/seguimientos/${id}/asesor`, { asesor_id: asesorId })
}

export function crearBitacora(id, bitacora) {
  return postJSON(`/seguimientos/${id}/bitacoras`, bitacora)
}

// estado: 'validada' | 'rechazada'
export function revisarBitacora(id, bitacoraId, estado, observacion = '') {
  return sendJSON('PATCH', `/seguimientos/${id}/bitacoras/${bitacoraId}`, { estado, observacion })
}

export function borrarBitacora(id, bitacoraId) {
  return request(`/seguimientos/${id}/bitacoras/${bitacoraId}`, { method: 'DELETE' })
}

export function crearReporte(id, { titulo, periodo, contenido, archivo }) {
  const body = new FormData()
  body.append('titulo', titulo)
  body.append('periodo', periodo)
  body.append('contenido', contenido)
  if (archivo) body.append('file', archivo)
  return request(`/seguimientos/${id}/reportes`, { method: 'POST', body })
}

export function descargarReporte(id, reporte) {
  return descargar(`/seguimientos/${id}/reportes/${reporte.id}/archivo`, reporte.archivo.nombre)
}

export function crearIncidencia(id, incidencia) {
  return postJSON(`/seguimientos/${id}/incidencias`, incidencia)
}

export function resolverIncidencia(id, incidenciaId, resolucion) {
  return sendJSON('PATCH', `/seguimientos/${id}/incidencias/${incidenciaId}`, { resolucion })
}

export function subirDocumento(id, documentoId, archivo) {
  const body = new FormData()
  body.append('file', archivo)
  return request(`/seguimientos/${id}/documentos/${documentoId}/archivo`, { method: 'POST', body })
}

export function descargarDocumento(id, documento) {
  const ultima = documento.versiones[documento.versiones.length - 1]
  return descargar(`/seguimientos/${id}/documentos/${documento.id}/archivo`, ultima.nombre)
}

export function firmarDocumento(id, documentoId) {
  return request(`/seguimientos/${id}/documentos/${documentoId}/firmar`, { method: 'POST' })
}

export function rechazarDocumento(id, documentoId, observacion) {
  return postJSON(`/seguimientos/${id}/documentos/${documentoId}/rechazar`, { observacion })
}

// ---- Coordinación ------------------------------------------------------------------------

export function getUsuarios(rol) {
  return request(`/auth/usuarios${rol ? `?rol=${rol}` : ''}`)
}

export function getCatalogoDocumentos() {
  return request('/catalogo-documentos')
}

export function createDocumentoCatalogo(payload) {
  return postJSON('/catalogo-documentos', payload)
}

export function updateDocumentoCatalogo(id, payload) {
  return sendJSON('PUT', `/catalogo-documentos/${id}`, payload)
}

export function deleteDocumentoCatalogo(id) {
  return request(`/catalogo-documentos/${id}`, { method: 'DELETE' })
}

export function getIndicadores() {
  return request('/coordinacion/indicadores')
}

export function getPostulacionesCoordinacion(estado) {
  return request(`/coordinacion/postulaciones${estado ? `?estado=${estado}` : ''}`)
}

export function getIncidenciasCoordinacion() {
  return request('/coordinacion/incidencias')
}

// rol: 'asesor_academico' | 'coordinador'
export function createPersonal(payload) {
  return postJSON('/auth/usuarios', payload)
}

export function setUsuarioActivo(id, activo) {
  return sendJSON('PATCH', `/auth/usuarios/${id}`, { activo })
}

// Traslado entre zonas: BFS, DFS, UCS, Greedy y A*
export function getTrasladoMapa() {
  return request('/search/traslado/mapa')
}

export function getTrasladoHeuristica(hacia) {
  return request(`/search/traslado/heuristica?${new URLSearchParams({ hacia })}`)
}

function paramsTraslado({ desde, hasta, limite, algoritmo }) {
  const p = new URLSearchParams({ desde, hasta })
  if (algoritmo) p.set('algoritmo', algoritmo)
  if (limite != null) p.set('limite', limite)
  return p
}

export function buscarTraslado(args) {
  return request(`/search/traslado/buscar?${paramsTraslado(args)}`)
}

export function compararTraslado(args) {
  return request(`/search/traslado/comparar?${paramsTraslado(args)}`)
}

export function todasLasRutasTraslado(args) {
  return request(`/search/traslado/todas?${paramsTraslado(args)}`)
}

export function getTrasladoResumen() {
  return request('/search/traslado/resumen')
}

export function getTrasladoPar(studentId, vacancyId) {
  return request(`/search/traslado/${studentId}/${vacancyId}`)
}
