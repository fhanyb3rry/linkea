import { useCallback, useEffect, useState } from 'react'
import { getMe, login as apiLogin, register as apiRegister } from '../services/api'
import { getToken, SESSION_EVENT, setToken } from '../lib/session'
import { AuthContext } from './auth'

// Sesión de la app: quién está conectado y su rol. Se carga una vez con /auth/me y la comparten
// todas las pantallas con useAuth() (en ./auth.js).

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(() => Boolean(getToken()))

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUsuario(null)
      setCargando(false)
      return null
    }
    try {
      const me = await getMe()
      setUsuario(me)
      return me
    } catch {
      setUsuario(null)
      return null
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    // Al abrir la app: si hay token guardado, se pregunta quién es.
    if (getToken()) {
      getMe()
        .then(setUsuario)
        .catch(() => setUsuario(null))
        .finally(() => setCargando(false))
    }
    // Si el token se borra (logout o 401 en cualquier petición), la sesión se cierra en toda la app.
    const onChange = () => !getToken() && setUsuario(null)
    window.addEventListener(SESSION_EVENT, onChange)
    return () => window.removeEventListener(SESSION_EVENT, onChange)
  }, [])

  async function entrar(data) {
    setToken(data.access_token)
    setUsuario(data.usuario)
    return data.usuario
  }

  const value = {
    usuario,
    cargando,
    refresh,
    login: async (email, password) => entrar(await apiLogin(email, password)),
    register: async (datos) => entrar(await apiRegister(datos)),
    logout: () => setToken(''),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
