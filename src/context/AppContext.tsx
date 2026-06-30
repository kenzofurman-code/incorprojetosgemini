import React, {
  createContext, useContext, useState, useEffect, type ReactNode
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import type { AppUser, Project } from '../types'
import { MOCK_USERS, MOCK_PROJECT } from '../data/mockData'

// ─── Seed IDs (from supabase/schema.sql) ────────────────────────────────────
export const SEED_PROJECT_ID = '11111111-1111-1111-1111-111111111111'
export const SEED_SCHEDULE_ID = '22222222-2222-2222-2222-222222222222'

// ─── Context type ────────────────────────────────────────────────────────────
interface AppContextType {
  // Auth
  session: Session | null
  authLoading: boolean
  signOut: () => Promise<void>

  // App state
  currentUser: AppUser
  currentProject: Project
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const AppContext = createContext<AppContextType | null>(null)

// ─── Map Supabase user + profile row → AppUser ───────────────────────────────
function buildAppUser(user: User, profile: Record<string, unknown> | null): AppUser {
  return {
    id: user.id,
    name: (profile?.full_name as string) || user.email?.split('@')[0] || 'Usuário',
    email: user.email || '',
    role: (profile?.role as AppUser['role']) || 'projetista',
    group: (profile?.user_group as AppUser['group']) || 'escritorio',
    avatarUrl: (profile?.avatar_url as string) || undefined,
    company: (profile?.company as string) || undefined,
    disciplines: (profile?.disciplines as string[]) || [],
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<AppUser>(MOCK_USERS[0])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Single project for now — could be made dynamic later
  const currentProject: Project = MOCK_PROJECT

  // ── Load profile row from `profiles` table ─────────────────────────────────
  async function loadProfile(user: User) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, role, user_group, avatar_url, company, disciplines')
        .eq('id', user.id)
        .single()
      setCurrentUser(buildAppUser(user, data))
    } catch {
      // Profile might not exist yet — still set basic user from auth
      setCurrentUser(buildAppUser(user, null))
    }
  }

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Se as variáveis do Supabase não estiverem configuradas, roda em modo demo
    if (!SUPABASE_CONFIGURED) {
      setAuthLoading(false)
      return
    }

    // 1. Grab current session immediately (avoids flash)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        loadProfile(data.session.user).finally(() => setAuthLoading(false))
      } else {
        setAuthLoading(false)
      }
    })

    // 2. Subscribe to future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        if (newSession?.user) {
          loadProfile(newSession.user)
        } else {
          // Logged out — reset to mock so pages never crash
          setCurrentUser(MOCK_USERS[0])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AppContext.Provider
      value={{
        session,
        authLoading,
        signOut,
        currentUser,
        currentProject,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
