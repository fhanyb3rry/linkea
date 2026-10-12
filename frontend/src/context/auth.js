import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// Sesión actual: { usuario, cargando, login, register, logout, refresh }. Ver AuthContext.jsx.
export function useAuth() {
  return useContext(AuthContext)
}

// Pantalla de inicio de cada rol después de entrar.
export function inicioDe(usuario) {
  if (usuario?.rol === 'estudiante' && !usuario.perfil_id) return '/perfil/crear'
  if (usuario?.rol === 'empresa' && !usuario.perfil_id) return '/empresa'
  return '/inicio'
}
