import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Bell, Search } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function Layout() {
  const { currentProject } = useApp()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface)' }}>
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
          style={{ background: 'var(--surface-mid)', borderColor: 'var(--surface-border)' }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: 'var(--slate)' }}>Empreendimentos</span>
            <span style={{ color: 'var(--surface-border)' }}>›</span>
            <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{currentProject.name}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate)' }} />
              <input
                type="text"
                placeholder="Buscar prancha..."
                className="pl-8 pr-4 py-1.5 text-sm rounded-lg outline-none"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  color: 'var(--white)',
                  width: '220px',
                }}
              />
            </div>
            <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--slate)' }}>
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: 'var(--orange)' }} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
