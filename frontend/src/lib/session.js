// Token de la sesión (JWT). Vive en localStorage para que la sesión sobreviva a recargar la página.
const KEY = 'linkea-token'
export const SESSION_EVENT = 'linkea-session-change'

let memory = '' // respaldo si localStorage no está disponible

export function getToken() {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return memory
  }
}

export function setToken(token) {
  memory = token
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch {
    // sin almacenamiento: la sesión dura hasta recargar
  }
  window.dispatchEvent(new Event(SESSION_EVENT))
}
