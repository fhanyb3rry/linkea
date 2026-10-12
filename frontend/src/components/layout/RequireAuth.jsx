import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/auth'

// Deja pasar solo con sesión (y, si se indican, solo a ciertos roles).
// Sin sesión manda al login y, al entrar, regresa a la página que se pidió.
export default function RequireAuth({ roles, children }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()

  if (cargando) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas font-body text-sm text-muted">Cargando…</div>
  }
  if (!usuario) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/inicio" replace />
  return children ?? <Outlet />
}
