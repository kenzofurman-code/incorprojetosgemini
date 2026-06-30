import { useState, useEffect, useCallback } from 'react'
import { listDrawings, uploadDrawing, type UploadDrawingParams } from '../lib/queries'
import { MOCK_DRAWINGS, DISCIPLINE_MAP } from '../data/mockData'
import type { Drawing } from '../types'

const SUPABASE_CONFIGURED = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

export function useDrawings(projectId: string) {
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingMockData, setUsingMockData] = useState(!SUPABASE_CONFIGURED)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!SUPABASE_CONFIGURED) {
      // No credentials yet -> show mock data so the UI stays demonstrable
      setDrawings(MOCK_DRAWINGS)
      setUsingMockData(true)
      setLoading(false)
      return
    }

    try {
      const data = await listDrawings(projectId)
      setDrawings(data)
      setUsingMockData(false)
    } catch (err) {
      console.error('[useDrawings] Falha ao buscar do Supabase, usando dados de exemplo:', err)
      setDrawings(MOCK_DRAWINGS)
      setUsingMockData(true)
      setError(err instanceof Error ? err.message : 'Erro ao carregar pranchas')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const upload = useCallback(async (params: UploadDrawingParams) => {
    if (!SUPABASE_CONFIGURED) {
      throw new Error(
        'Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local para habilitar upload real.'
      )
    }
    const newDrawing = await uploadDrawing(params)
    const disc = DISCIPLINE_MAP[newDrawing.disciplineCode]
    if (disc) newDrawing.discipline = disc.name
    setDrawings(prev => [newDrawing, ...prev])
    return newDrawing
  }, [])

  return { drawings, loading, error, usingMockData, refresh, upload }
}
