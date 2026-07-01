import { useState, useEffect, useCallback } from 'react'
import { getDashboardStats, type LiveDashboardData } from '../lib/queries'
import { SUPABASE_CONFIGURED } from '../lib/supabase'

const EMPTY_DASHBOARD: LiveDashboardData = {
  stats: {
    totalDrawings: 0,
    approvedDrawings: 0,
    inReviewDrawings: 0,
    rejectedDrawings: 0,
    liberadoObra: 0,
    totalIssues: 0,
    openIssues: 0,
    resolvedIssues: 0,
    totalPlots: 0,
    obsoletePlots: 0,
    pendingPlots: 0,
    overdueDeliverables: 0,
    onTimeRate: 0,
  },
  docsByDiscipline: [],
  docsByStatus: [],
  issuesByCategory: [],
  weeklyActivity: [],
  recentDrawings: [],
}

export function useDashboard(projectId: string) {
  const [data, setData] = useState<LiveDashboardData>(EMPTY_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingMockData] = useState(!SUPABASE_CONFIGURED)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!SUPABASE_CONFIGURED) {
      setData(EMPTY_DASHBOARD)
      setLoading(false)
      return
    }

    try {
      const live = await getDashboardStats(projectId)
      setData(live)
    } catch (err) {
      console.error('[useDashboard] Erro ao buscar stats:', err)
      setData(EMPTY_DASHBOARD)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { refresh() }, [refresh])

  return { ...data, loading, error, usingMockData, refresh }
}
