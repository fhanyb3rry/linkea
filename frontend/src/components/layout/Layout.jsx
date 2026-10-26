import { useState } from 'react'
import PageTransition from './PageTransition'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const KEY = 'linkea-sidebar'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  // El sidebar de escritorio se puede plegar; se recuerda entre visitas.
  const [abierta, setAbierta] = useState(() => localStorage.getItem(KEY) !== 'cerrada')

  function alternarSidebar() {
    setAbierta((v) => {
      localStorage.setItem(KEY, v ? 'cerrada' : 'abierta')
      return !v
    })
  }

  return (
    <div className="min-h-screen">
      <div className="app-bg" aria-hidden="true" />
      <aside
        className={`glass fixed inset-y-0 left-0 z-40 hidden w-64 border-y-0 border-l-0 transition-transform duration-300 lg:block ${
          abierta ? 'lg:translate-x-0' : 'lg:-translate-x-full'
        }`}
      >
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <aside className="glass-strong relative h-full w-72 max-w-[85%] border-y-0 border-l-0 shadow-xl">
            <Sidebar onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className={`transition-[padding] duration-300 ${abierta ? 'lg:pl-64' : ''}`}>
        <Topbar onOpenMenu={() => setMenuOpen(true)} onToggleSidebar={alternarSidebar} sidebarAbierta={abierta} />
        <main>
          <PageTransition />
        </main>
      </div>
    </div>
  )
}
