import React, {
  createContext, useContext, useState, useEffect, useCallback, type ReactNode
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
  session: Session | null
  authLoading: boolean
  signOut: () => Promise<void>
  currentUser: AppUser
  currentProject: Project
  projects: Project[]
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const AppContext = createContext<AppContextType | null>(null)

// ─── Map profile row → AppUser ────────────────────────────────────────────────
function buildAppUser(user: User, profile: Record<string, unknown> | null): AppUser {
  return {
    id: user.id,
    // profiles table uses "name", not "full_name"
    name: (profile?.name as string) || user.email?.split('@')[0] || 'Usuário',
    email: user.email || '',
    role: (profile?.role as AppUser['role']) || 'projetista',
    group: (profile?.user_group as AppUser['group']) || 'escritorio',
    avatarUrl: (profile?.avatar_url as string) || undefined,
    company: (profile?.company as string) || undefined,
    disciplines: (profile?.disciplines as string[]) || [],
  }
}

// ─── Map DB row → Project ─────────────────────────────────────────────────────
function buildProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    code: row.code as string,
    address: row.address as string || '',
    client: row.client as string || '',
    totalFloors: (row.total_floors as number) || 0,
    basements: (row.basements as number) || 0,
    startDate: row.start_date as string || '',
    status: (row.status as Project['status']) || 'ativo',
    photoUrl: row.photo_url as string || undefined,
    scheduleId: row.schedule_id as string || undefined,
    disciplines: (row.disciplines as string[]) || [],
    floors: [],
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<AppUser>(MOCK_USERS[0])
  const [projects, setProjects] = useState<Project[]>([MOCK_PROJECT])
  const [currentProject, setCurrentProject] = useState<Project>(MOCK_PROJECT)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // ── Load profile from `profiles` table ────────────────────────────────────
  async function loadProfile(user: User) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name, role, user_group, avatar_url, company, disciplines')
        .eq('id', user.id)
        .single()
      setCurrentUser(buildAppUser(user, data))
    } catch {
      setCurrentUser(buildAppUser(user, null))
    }
  }

  // ── Load projects from `projects` table ────────────────────────────────────
  const loadProjects = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) return
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (error || !data || data.length === 0) return
      const mapped = data.map(r => buildProject(r as Record<string, unknown>))
      setProjects(mapped)
      // Set the first real project as current
      setCurrentProject(mapped[0])
    } catch (err) {
      console.error('[AppContext] Failed to load projects:', err)
    }
  }, [])

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setAuthLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        Promise.all([
          loadProfile(data.session.user),
          loadProjects(),
        ]).finally(() => setAuthLoading(false))
      } else {
        setAuthLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        if (newSession?.user) {
          loadProfile(newSession.user)
          loadProjects()
        } else {
          setCurrentUser(MOCK_USERS[0])
          setProjects([MOCK_PROJECT])
          setCurrentProject(MOCK_PROJECT)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProjects])

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
        projects,
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
