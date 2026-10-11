const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  if (!response.ok) {
    // El backend manda mensajes claros en `detail` (p. ej. "Ya te postulaste a esta vacante")
    let detail = ''
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') detail = body.detail
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

export function cvUrl(studentId) {
  return `${API_BASE_URL}/students/${studentId}/cv`
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
