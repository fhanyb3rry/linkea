const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  if (!response.ok) {
    throw new Error(`Error ${response.status} al consultar ${path}`)
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
