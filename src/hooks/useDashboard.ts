import { useState, useEffect, useCallback } from 'react'
import { getDashboardStats, type LiveDashboardData } from '../lib/queries'
import { SUPABASE_CONFIGURED } from '../lib/supabase'
import {
  MOCK_DASHBOARD_STATS,
  DOCS_BY_DISCIPLINE_DATA,
  DOCS_BY_STATUS_DATA,
  ISSUES_BY_CATEGORY,
  WEEKLY_ACTIVITY,
  MOCK_DRAWINGS,
} from '../data/mockData'

// ── Mock fallback shape ────────────────────────────────────────────────────────
const MOCK_DASHBOARD: LiveDashboardData = {
  stats: MOCK_DASHBOARD_STATS,
  docsByDiscipline: DOCS_BY_DISCIPLINE_DATA,
  docsByStatus: DOCS_BY_STATUS_DATA,
  issuesByCategory: ISSUES_BY_CATEGORY,
  weeklyActivity: WEEKLY_ACTIVITY,
  recentDrawings: MOCK_DRAWINGS.slice(0, 5),
}

export function useDashboard(projectId: string) {
  const [data, setData] = useState<LiveDashboardData>(MOCK_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingMockData, setUsingMockData] = useState(!SUPABASE_CONFIGURED)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!SUPABASE_CONFIGURED) {
      setData(MOCK_DASHBOARD)
      setUsingMockData(true)
      setLoading(false)
      return
    }

    try {
      const live = await getDashboardStats(projectId)
      setData(live)
      setUsingMockData(false)
    } catch (err) {
      console.error('[useDashboard] Falha ao buscar dados reais, usando mock:', err)
      setData(MOCK_DASHBOARD)
      setUsingMockData(true)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...data, loading, error, usingMockData, refresh }
}
