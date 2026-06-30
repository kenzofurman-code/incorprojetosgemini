import { useState, useEffect, useCallback } from 'react'
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import { MOCK_PLOT_ORDERS } from '../data/mockData'
import type { PlotOrder } from '../types'

// ─── DB row mapper ────────────────────────────────────────────────────────────
function mapPlotOrder(row: Record<string, unknown>): PlotOrder {
  return {
    id: row.id as string,
    drawingId: row.drawing_id as string,
    drawingCode: (row.drawing_code as string) || '',
    drawingRevision: (row.drawing_revision as string) || '',
    isCurrentVersion: (row.is_current_version as boolean) ?? true,
    requestedBy: (row.requested_by_name as string) || '',
    printedBy: row.printed_by_name as string | undefined,
    printedAt: row.printed_at as string | undefined,
    deliveredTo: row.delivered_to as string | undefined,
    deliveredAt: row.delivered_at as string | undefined,
    location: row.location as string | undefined,
    copies: (row.copies as number) || 1,
    format: (row.format as PlotOrder['format']) || 'A1',
    status: (row.status as PlotOrder['status']) || 'solicitado',
    scannedAt: row.scanned_at as string | undefined,
    notes: row.notes as string | undefined,
    projectId: row.project_id as string,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePlotOrders(projectId: string) {
  const [plotOrders, setPlotOrders] = useState<PlotOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingMockData, setUsingMockData] = useState(!SUPABASE_CONFIGURED)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!SUPABASE_CONFIGURED) {
      setPlotOrders(MOCK_PLOT_ORDERS)
      setUsingMockData(true)
      setLoading(false)
      return
    }

    try {
      const { data, error: err } = await supabase
        .from('plot_orders')
        .select('*, profiles!requested_by(full_name), printed_profiles:profiles!printed_by(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (err) throw err

      const mapped = (data || []).map((row: Record<string, unknown>) => {
        // Resolve denormalized names from joins
        const reqName = (row.profiles as { full_name: string } | null)?.full_name
        const prtName = (row.printed_profiles as { full_name: string } | null)?.full_name
        return mapPlotOrder({ ...row, requested_by_name: reqName, printed_by_name: prtName })
      })
      setPlotOrders(mapped)
      setUsingMockData(false)
    } catch (err) {
      console.error('[usePlotOrders] Falha ao buscar do Supabase, usando mock:', err)
      setPlotOrders(MOCK_PLOT_ORDERS)
      setUsingMockData(true)
      setError(err instanceof Error ? err.message : 'Erro ao carregar plotagens')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { refresh() }, [refresh])

  // ── Create plot order ───────────────────────────────────────────────────────
  const createPlotOrder = useCallback(async (params: {
    drawingId: string
    drawingCode: string
    drawingRevision: string
    copies: number
    format: PlotOrder['format']
    deliveredTo?: string
    location?: string
    requestedById?: string
    requestedByName: string
  }): Promise<PlotOrder> => {
    if (!SUPABASE_CONFIGURED) {
      const newOrder: PlotOrder = {
        id: `plt-${Date.now()}`,
        drawingId: params.drawingId,
        drawingCode: params.drawingCode,
        drawingRevision: params.drawingRevision,
        isCurrentVersion: true,
        requestedBy: params.requestedByName,
        copies: params.copies,
        format: params.format,
        deliveredTo: params.deliveredTo,
        location: params.location,
        status: 'solicitado',
        projectId,
      }
      setPlotOrders(prev => [newOrder, ...prev])
      return newOrder
    }

    const { data, error } = await supabase.from('plot_orders').insert({
      project_id: projectId,
      drawing_id: params.drawingId,
      drawing_code: params.drawingCode,
      drawing_revision: params.drawingRevision,
      is_current_version: true,
      requested_by: params.requestedById || null,
      requested_by_name: params.requestedByName,
      copies: params.copies,
      format: params.format,
      delivered_to: params.deliveredTo || null,
      location: params.location || null,
      status: 'solicitado',
    }).select().single()

    if (error) throw error
    const newOrder = mapPlotOrder(data as Record<string, unknown>)
    setPlotOrders(prev => [newOrder, ...prev])
    return newOrder
  }, [projectId])

  return { plotOrders, loading, error, usingMockData, refresh, createPlotOrder }
}
