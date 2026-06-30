import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, FolderOpen, FileSearch,
  Building2, Printer, ChevronLeft, ChevronRight,
  HardHat, LogOut, Layers
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const OFFICE_NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/cronograma',  icon: Calendar,         label: 'Cronograma'       },
  { to: '/projetos',    icon: FolderOpen,       label: 'Projetos'         },
  { to: '/revisao',     icon: FileSearch,       label: 'Revisão'          },
]

const FIELD_NAV = [
  { to: '/obra',        icon: Building2,        label: 'Armário de Obra'  },
  { to: '/versoes',     icon: Layers,           label: 'Versões em Campo' },
  { to: '/plotagem',    icon: Printer,          label: 'Plotagem'         },
]

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, currentUser, currentProject, signOut } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const roleLabel = {
    coordenador: 'Coordenador',
    projetista: 'Projetista',
    fiscal_obra: 'Fiscal de Obra',
    admin: 'Administrador',
  }[currentUser.role]

  return (
    <aside
      className="flex flex-col h-screen transition-all duration-300 border-r"
      style={{
        width: sidebarOpen ? '240px' : '64px',
        background: 'var(--surface-mid)',
        borderColor: 'var(--surface-border)',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--surface-border)' }}>
        {sidebarOpen && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--orange)' }}>
              IP
            </div>
            <span className="font-bold text-sm tracking-tight truncate" style={{ color: 'var(--white)' }}>
              IncorProjetos
            </span>
          </div>
        )}
        {!sidebarOpen && (
          <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold mx-auto"
            style={{ background: 'var(--orange)' }}>
            IP
          </div>
        )}
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--slate)' }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Project badge */}
      {sidebarOpen && (
        <div className="mx-3 my-3 p-2 rounded-lg" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div className="text-xs font-mono" style={{ color: 'var(--orange)' }}>
            {currentProject.code}
          </div>
          <div className="text-xs font-medium truncate" style={{ color: 'var(--white)' }}>
            {currentProject.name}
          </div>
        </div>
      )}

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-5">
        {/* Office */}
        <div>
          {sidebarOpen && (
            <div className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--slate)' }}>
              Escritório
            </div>
          )}
          <ul className="space-y-0.5">
            {OFFICE_NAV.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'text-white'
                        : 'hover:bg-white/5'
                    }`
                  }
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--navy-mid)' : undefined,
                    color: isActive ? 'var(--white)' : 'var(--slate)',
                  })}
                  title={!sidebarOpen ? label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {sidebarOpen && <span>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Field */}
        <div>
          {sidebarOpen && (
            <div className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--slate)' }}>
              <HardHat size={12} />
              Obra
            </div>
          )}
          <ul className="space-y-0.5">
            {FIELD_NAV.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive ? 'text-white' : 'hover:bg-white/5'
                    }`
                  }
                  style={({ isActive }) => ({
                    background: isActive ? 'rgba(249,115,22,0.2)' : undefined,
                    color: isActive ? 'var(--orange)' : 'var(--slate)',
                    border: isActive ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent',
                  })}
                  title={!sidebarOpen ? label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {sidebarOpen && <span>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Expand button when collapsed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="m-2 p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
          style={{ color: 'var(--slate)' }}
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* User */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--surface-border)' }}>
        {sidebarOpen ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--navy-mid)' }}>
              {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-semibold truncate" style={{ color: 'var(--white)' }}>
                {currentUser.name.split(' ')[0]} {currentUser.name.split(' ').slice(-1)[0]}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--slate)' }}>{roleLabel}</div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sair"
              className="p-1 hover:text-white transition-colors rounded"
              style={{ color: 'var(--slate)' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'var(--navy-mid)' }}>
              {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
