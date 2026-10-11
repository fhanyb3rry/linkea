import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

// Envuelve el contenido de la página: al cambiar de ruta se vuelve a montar (key) y entra con la
// misma animación de aparición que el inicio. También regresa el scroll arriba.
export default function PageTransition() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div key={pathname} className="page-enter">
      <Outlet />
    </div>
  )
}
