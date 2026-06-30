import { useState, useEffect, useCallback } from 'react'
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import { MOCK_REVIEWS, MOCK_ISSUES } from '../data/mockData'
import type { Review, Issue } from '../types'

// ─── DB row mappers ───────────────────────────────────────────────────────────
function mapIssue(row: Record<string, unknown>): Issue {
  return {
    id: row.id as string,
    reviewId: row.review_id as string,
    drawingId: row.drawing_id as string,
    x: Number(row.x),
    y: Number(row.y),
    pageNumber: (row.page_number as number) || 1,
    category: row.category as Issue['category'],
    status: row.status as Issue['status'],
    title: row.title as string,
    description: (row.description as string) || '',
    assignedTo: row.assigned_to as string | undefined,
    priority: (row.priority as Issue['priority']) || 'media',
    createdBy: (row.created_by as string) || '',
    createdAt: row.created_at as string,
    resolvedAt: row.resolved_at as string | undefined,
  }
}

function mapReview(row: Record<string, unknown>, issues: Issue[]): Review {
  return {
    id: row.id as string,
    drawingId: row.drawing_id as string,
    drawingCode: (row.drawing_code as string) || '',
    revision: (row.revision as string) || '',
    reviewerName: (row.reviewer_name as string) || '',
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string | undefined,
    status: row.status as Review['status'],
    decision: row.decision as Review['decision'],
    notes: row.notes as string | undefined,
    issues,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useReviews(drawingId?: string) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingMockData, setUsingMockData] = useState(!SUPABASE_CONFIGURED)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!SUPABASE_CONFIGURED) {
      const mockIssues = drawingId
        ? MOCK_ISSUES.filter(i => i.drawingId === drawingId)
        : MOCK_ISSUES
      const mockReviews = drawingId
        ? MOCK_REVIEWS.filter(r => r.drawingId === drawingId)
        : MOCK_REVIEWS
      setIssues(mockIssues)
      setReviews(mockReviews)
      setUsingMockData(true)
      setLoading(false)
      return
    }

    try {
      // Fetch issues
      let issueQuery = supabase.from('issues').select('*').order('created_at', { ascending: true })
      if (drawingId) issueQuery = issueQuery.eq('drawing_id', drawingId)
      const { data: issueData, error: issueErr } = await issueQuery
      if (issueErr) throw issueErr
      const mappedIssues = (issueData || []).map(mapIssue)
      setIssues(mappedIssues)

      // Fetch reviews
      let reviewQuery = supabase.from('reviews').select('*').order('started_at', { ascending: false })
      if (drawingId) reviewQuery = reviewQuery.eq('drawing_id', drawingId)
      const { data: reviewData, error: reviewErr } = await reviewQuery
      if (reviewErr) throw reviewErr

      const mappedReviews = (reviewData || []).map((r: Record<string, unknown>) => {
        const relatedIssues = mappedIssues.filter(i => i.reviewId === r.id)
        return mapReview(r, relatedIssues)
      })
      setReviews(mappedReviews)
      setUsingMockData(false)
    } catch (err) {
      console.error('[useReviews] Falha ao buscar do Supabase, usando mock:', err)
      const mockIssues = drawingId ? MOCK_ISSUES.filter(i => i.drawingId === drawingId) : MOCK_ISSUES
      const mockReviews = drawingId ? MOCK_REVIEWS.filter(r => r.drawingId === drawingId) : MOCK_REVIEWS
      setIssues(mockIssues)
      setReviews(mockReviews)
      setUsingMockData(true)
      setError(err instanceof Error ? err.message : 'Erro ao carregar revisões')
    } finally {
      setLoading(false)
    }
  }, [drawingId])

  useEffect(() => { refresh() }, [refresh])

  // ── Create issue ────────────────────────────────────────────────────────────
  const createIssue = useCallback(async (params: {
    drawingId: string
    reviewId?: string
    x: number
    y: number
    pageNumber?: number
    category: Issue['category']
    title: string
    description?: string
    priority?: Issue['priority']
    createdBy: string
  }): Promise<Issue> => {
    if (!SUPABASE_CONFIGURED) {
      // Optimistic local-only
      const newIssue: Issue = {
        id: `iss-${Date.now()}`,
        reviewId: params.reviewId || 'local',
        drawingId: params.drawingId,
        x: params.x, y: params.y,
        pageNumber: params.pageNumber || 1,
        category: params.category,
        status: 'aberto',
        title: params.title,
        description: params.description || '',
        priority: params.priority || 'media',
        createdBy: params.createdBy,
        createdAt: new Date().toISOString(),
      }
      setIssues(prev => [...prev, newIssue])
      return newIssue
    }

    const { data, error } = await supabase.from('issues').insert({
      drawing_id: params.drawingId,
      review_id: params.reviewId || null,
      x: params.x, y: params.y,
      page_number: params.pageNumber || 1,
      category: params.category,
      title: params.title,
      description: params.description || null,
      priority: params.priority || 'media',
      created_by: params.createdBy || null,
      status: 'aberto',
    }).select().single()

    if (error) throw error
    const newIssue = mapIssue(data as Record<string, unknown>)
    setIssues(prev => [...prev, newIssue])
    return newIssue
  }, [])

  return { reviews, issues, loading, error, usingMockData, refresh, createIssue }
}
