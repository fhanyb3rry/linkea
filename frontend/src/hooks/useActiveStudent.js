import { useSyncExternalStore } from 'react'

// Perfil de estudiante "activo" (aún no hay cuentas): se comparte entre toda la app y se guarda en
// localStorage. Es la misma clave que usaba el panel de elegibilidad del detalle de vacante.
const KEY = 'linkea-student'
const EVENT = 'linkea-student-change'

let memory = '' // respaldo si localStorage no está disponible

function read() {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return memory
  }
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export function setActiveStudent(id) {
  memory = id
  try {
    if (id) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
  } catch {
    // sin almacenamiento: la selección dura solo la sesión
  }
  window.dispatchEvent(new Event(EVENT))
}

export default function useActiveStudent() {
  const id = useSyncExternalStore(subscribe, read, () => '')
  return [id, setActiveStudent]
}
