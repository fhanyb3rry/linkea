import { useState } from 'react'
import PageTransition from './PageTransition'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="relative h-full w-72 max-w-[85%] bg-surface shadow-xl">
            <Sidebar onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main>
          <PageTransition />
        </main>
      </div>
    </div>
  )
}
