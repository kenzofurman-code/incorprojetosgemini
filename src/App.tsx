import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { SUPABASE_CONFIGURED } from './lib/supabase'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Cronograma from './pages/cronograma/Cronograma'
import Projetos from './pages/projetos/Projetos'
import Comparar from './pages/projetos/Comparar'
import Sobrepor from './pages/projetos/Sobrepor'
import Revisao from './pages/review/Revisao'
import Obra from './pages/obra/Obra'
import Versoes from './pages/obra/Versoes'
import Plotagem from './pages/plotagem/Plotagem'

// ─── Auth Guard ───────────────────────────────────────────────────────────────
// Redirects unauthenticated users to /login.
// When SUPABASE_CONFIGURED is false (demo mode), passes through without checking.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, authLoading } = useApp()

  // Sem Supabase configurado → modo demo, passa direto
  if (!SUPABASE_CONFIGURED) {
    return <>{children}</>
  }

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--surface)' }}
      >
        <svg
          className="animate-spin"
          width={32}
          height={32}
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: 'var(--orange)' }}
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — all wrapped in RequireAuth + Layout */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"                    element={<Dashboard />} />
            <Route path="cronograma"                   element={<Cronograma />} />
            <Route path="projetos"                     element={<Projetos />} />
            <Route path="projetos/:id/comparar"        element={<Comparar />} />
            <Route path="projetos/:id/sobrepor"        element={<Sobrepor />} />
            <Route path="projetos/:id/revisao"         element={<Revisao />} />
            <Route path="revisao"                      element={<Revisao />} />
            <Route path="obra"                         element={<Obra />} />
            <Route path="versoes"                      element={<Versoes />} />
            <Route path="plotagem"                     element={<Plotagem />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
