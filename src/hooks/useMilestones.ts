import { useState, useEffect, useCallback } from 'react'
import { listMilestones, createMilestone, type CreateMilestoneParams } from '../lib/queries'
import { MOCK_MILESTONES } from '../data/mockData'
import type { Milestone } from '../types'

const SUPABASE_CONFIGURED = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

export function useMilestones(projectId: string) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingMockData, setUsingMockData] = useState(!SUPABASE_CONFIGURED)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!SUPABASE_CONFIGURED) {
      setMilestones(MOCK_MILESTONES)
      setUsingMockData(true)
      setLoading(false)
      return
    }

    try {
      const data = await listMilestones(projectId)
      setMilestones(data)
      setUsingMockData(false)
    } catch (err) {
      console.error('[useMilestones] Falha ao buscar do Supabase, usando dados de exemplo:', err)
      setMilestones(MOCK_MILESTONES)
      setUsingMockData(true)
      setError(err instanceof Error ? err.message : 'Erro ao carregar cronograma')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(async (params: CreateMilestoneParams) => {
    if (!SUPABASE_CONFIGURED) {
      throw new Error(
        'Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local para salvar marcos reais.'
      )
    }
    const newMilestone = await createMilestone(params)
    setMilestones(prev => [...prev, newMilestone].sort(
      (a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()
    ))
    return newMilestone
  }, [])

  return { milestones, loading, error, usingMockData, refresh, add }
}
