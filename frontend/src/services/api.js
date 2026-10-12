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

export function getVacancies() {
  return request('/vacancies')
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

// Descarga el CV con la sesión (un <a href> normal no manda el token).
export async function descargarCV(studentId, nombre = 'curriculum') {
  const response = await send(`/students/${studentId}/cv`)
  if (!response.ok) throw new Error('No se pudo descargar el currículum')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = nombre
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---- Vacantes ----------------------------------------------------------------------------

export function updateVacancy(id, payload) {
  return sendJSON('PUT', `/vacancies/${id}`, payload)
}

export function deleteVacancy(id) {
  return request(`/vacancies/${id}`, { method: 'DELETE' })
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
