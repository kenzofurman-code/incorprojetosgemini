import { supabase, BUCKETS } from './supabase'
import type { DbDrawing, DbDrawingVersion, DbMilestone } from '../types/database'
import type { Drawing, DrawingVersion, Milestone } from '../types'

// ─── Mapping: DB row -> domain type used by the UI ───────────────────────────
function mapDrawing(row: DbDrawing, versions: DbDrawingVersion[] = []): Drawing {
  return {
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    discipline: row.discipline_code, // resolved name is added by caller if needed
    disciplineCode: row.discipline_code,
    floor: row.floor_code,
    type: row.doc_type || '',
    number: row.number || '',
    revision: row.revision,
    phase: row.phase,
    status: row.status,
    title: row.title || '',
    pdfUrl: row.pdf_url || undefined,
    thumbnailUrl: row.thumbnail_url || undefined,
    designerName: row.designer_name || '',
    sentAt: row.sent_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at || undefined,
    approvedBy: row.approved_by || undefined,
    isOriginal: row.is_original,
    qrCodeData: row.qr_code_data || undefined,
    qrCodeX: row.qr_code_x != null ? Number(row.qr_code_x) : undefined,
    qrCodeY: row.qr_code_y != null ? Number(row.qr_code_y) : undefined,
    qrCodePage: row.qr_code_page != null ? Number(row.qr_code_page) : undefined,
    versions: versions.map(mapVersion),
  }
}

function mapVersion(v: DbDrawingVersion): DrawingVersion {
  return {
    revision: v.revision,
    pdfUrl: v.pdf_url || undefined,
    sentAt: v.sent_at,
    status: v.status,
    approvedAt: v.approved_at || undefined,
    notes: v.notes || undefined,
  }
}

// ─── List drawings for a project, with discipline name resolved ─────────────
export async function listDrawings(projectId: string): Promise<Drawing[]> {
  const { data, error } = await supabase
    .from('drawings')
    .select('*, disciplines(name)')
    .eq('project_id', projectId)
    .order('sent_at', { ascending: false })

  if (error) throw error

  // Fetch version history grouped by the code prefix (without revision suffix)
  const drawings = (data || []) as (DbDrawing & { disciplines: { name: string } | null })[]

  const groupCodes = [...new Set(drawings.map(d => d.code.replace(/-R\d+$/, '')))]
  const { data: versionsData } = await supabase
    .from('drawing_versions')
    .select('*')
    .in('drawing_group_code', groupCodes)
    .order('sent_at', { ascending: true })

  const versionsByGroup = new Map<string, DbDrawingVersion[]>()
  for (const v of versionsData || []) {
    const arr = versionsByGroup.get(v.drawing_group_code) || []
    arr.push(v)
    versionsByGroup.set(v.drawing_group_code, arr)
  }

  return drawings.map(d => {
    const groupCode = d.code.replace(/-R\d+$/, '')
    const mapped = mapDrawing(d, versionsByGroup.get(groupCode) || [])
    mapped.discipline = d.disciplines?.name || d.discipline_code
    return mapped
  })
}

// ─── Get a single drawing by id ───────────────────────────────────────────────
export async function getDrawing(id: string): Promise<Drawing | null> {
  const { data, error } = await supabase
    .from('drawings')
    .select('*, disciplines(name)')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const row = data as DbDrawing & { disciplines: { name: string } | null }
  const groupCode = row.code.replace(/-R\d+$/, '')

  const { data: versionsData } = await supabase
    .from('drawing_versions')
    .select('*')
    .eq('drawing_group_code', groupCode)
    .order('sent_at', { ascending: true })

  const mapped = mapDrawing(row, versionsData || [])
  mapped.discipline = row.disciplines?.name || row.discipline_code
  return mapped
}

// ─── Upload params ────────────────────────────────────────────────────────────
export interface UploadDrawingParams {
  projectId: string
  file: File
  code: string             // full code e.g. "043-EP-ARQ-P03-PLA-002-R00"
  disciplineCode: string
  floorCode: string
  docType: string
  number: string
  revision: string
  phase: Drawing['phase']
  title: string
  designerName: string
  designerId?: string
}

// ─── Upload a new drawing: file -> Storage, metadata -> drawings table ──────
export async function uploadDrawing(params: UploadDrawingParams): Promise<Drawing> {
  const {
    projectId, file, code, disciplineCode, floorCode,
    docType, number, revision, phase, title, designerName, designerId,
  } = params

  // 1. Upload file to Storage under projectId/code.pdf
  const path = `${projectId}/${code}.pdf`
  const { error: uploadError } = await supabase.storage
    .from(BUCKETS.DRAWINGS)
    .upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKETS.DRAWINGS).getPublicUrl(path)
  const pdfUrl = urlData.publicUrl

  // 2. Insert metadata row
  const { data, error } = await supabase
    .from('drawings')
    .insert({
      project_id: projectId,
      code,
      discipline_code: disciplineCode,
      floor_code: floorCode,
      doc_type: docType,
      number,
      revision,
      phase,
      status: 'em_analise',
      title,
      pdf_url: pdfUrl,
      designer_id: designerId || null,
      designer_name: designerName,
      is_original: true,
    })
    .select()
    .single()

  if (error) throw error

  // 3. Insert into version history
  const groupCode = code.replace(/-R\d+$/, '')
  await supabase.from('drawing_versions').insert({
    drawing_group_code: groupCode,
    drawing_id: data.id,
    revision,
    pdf_url: pdfUrl,
    status: 'em_analise',
  })

  return mapDrawing(data as DbDrawing)
}

// ─── Update drawing status (approve / reject / liberar para obra) ──────────
export async function updateDrawingStatus(
  id: string,
  status: Drawing['status'],
  approvedBy?: string
) {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'aprovado' || status === 'liberado_para_obra') {
    updates.approved_at = new Date().toISOString()
    if (approvedBy) updates.approved_by = approvedBy
  }

  const { error } = await supabase.from('drawings').update(updates).eq('id', id)
  if (error) throw error

  // Keep version history status in sync
  const { data: drawing } = await supabase.from('drawings').select('code').eq('id', id).single()
  if (drawing) {
    await supabase
      .from('drawing_versions')
      .update({ status, approved_at: updates.approved_at as string | undefined })
      .eq('drawing_id', id)
  }
}

export async function updateDrawingQrCodePosition(id: string, x: number, y: number, page: number) {
  const { error } = await supabase
    .from('drawings')
    .update({
      qr_code_x: x,
      qr_code_y: y,
      qr_code_page: page,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) throw error
}

// ─── MILESTONES (Cronograma) ───────────────────────────────────────────────

function mapMilestone(row: DbMilestone): Milestone {
  return {
    id: row.id,
    projectId: row.project_id,
    disciplineCode: row.discipline_code,
    phase: row.phase,
    description: row.description,
    plannedDate: row.planned_date,
    actualDate: row.actual_date || undefined,
    status: row.status,
    responsibleName: row.responsible_name || '',
    constructionNeed: row.construction_need || undefined,
    priority: row.priority,
  }
}

export async function listMilestones(projectId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('planned_date', { ascending: true })

  if (error) throw error
  return (data || []).map(mapMilestone)
}

export interface CreateMilestoneParams {
  projectId: string
  scheduleId: string
  disciplineCode: string
  phase: Milestone['phase']
  description: string
  plannedDate: string
  constructionNeed?: string
  responsibleName: string
  responsibleId?: string
  priority: Milestone['priority']
}

export async function createMilestone(params: CreateMilestoneParams): Promise<Milestone> {
  const { data, error } = await supabase
    .from('milestones')
    .insert({
      project_id: params.projectId,
      schedule_id: params.scheduleId,
      discipline_code: params.disciplineCode,
      phase: params.phase,
      description: params.description,
      planned_date: params.plannedDate,
      construction_need: params.constructionNeed || null,
      responsible_name: params.responsibleName,
      responsible_id: params.responsibleId || null,
      priority: params.priority,
      status: 'no_prazo',
    })
    .select()
    .single()

  if (error) throw error
  return mapMilestone(data as DbMilestone)
}

export async function updateMilestoneStatus(id: string, status: Milestone['status'], actualDate?: string) {
  const updates: Record<string, unknown> = { status }
  if (actualDate) updates.actual_date = actualDate

  const { error } = await supabase.from('milestones').update(updates).eq('id', id)
  if (error) throw error
}

// Recalculates status based on dates — call periodically or after insert/update
export function deriveMilestoneStatus(plannedDate: string, actualDate?: string): Milestone['status'] {
  if (actualDate) return 'concluido'
  const diff = (new Date(plannedDate).getTime() - Date.now()) / 86400000
  if (diff < 0) return 'atrasado'
  if (diff <= 7) return 'a_vencer'
  return 'no_prazo'
}

// ─── PROFILES (Auth) ───────────────────────────────────────────────────────
export interface ProfileRow {
  id: string
  full_name: string | null
  role: string | null
  user_group: string | null
  avatar_url: string | null
  company: string | null
  disciplines: string[] | null
}

/** Fetch the profile for the currently logged-in user. Returns null if not found. */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, user_group, avatar_url, company, disciplines')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data as ProfileRow
}

/** Upsert a profile row — used after sign-up or when editing profile info. */
export async function upsertProfile(profile: Partial<ProfileRow> & { id: string }) {
  const { error } = await supabase.from('profiles').upsert(profile)
  if (error) throw error
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export interface DisciplineChartItem {
  name: string
  total: number
  color: string
}

export interface StatusChartItem {
  name: string
  value: number
  color: string
}

export interface IssuesCategoryItem {
  name: string
  value: number
  color: string
}

export interface WeeklyActivityItem {
  week: string
  novos: number
  atualizados: number
}

export interface LiveDashboardData {
  stats: import('../types').DashboardStats
  docsByDiscipline: DisciplineChartItem[]
  docsByStatus: StatusChartItem[]
  issuesByCategory: IssuesCategoryItem[]
  weeklyActivity: WeeklyActivityItem[]
  recentDrawings: Drawing[]
}

// Colour map for disciplines — matches DISCIPLINE_MAP in mockData
const DISC_COLORS: Record<string, string> = {
  ARQ: '#22C55E', EST: '#3B82F6', ELE: '#EAB308', HID: '#06B6D4',
  AR:  '#8B5CF6', INC: '#EF4444', GAS: '#F97316', FND: '#92400E',
  TOP: '#6B7280', ARR: '#1D4ED8', AUT: '#7C3AED', ELEV: '#BE185D',
  INT: '#0D9488', PAI: '#16A34A',
}

// Category label map
const CAT_LABELS: Record<string, string> = {
  conflito_projeto: 'Conflito de Projeto',
  incompletude:     'Incompletude',
  erro_cota:        'Erro de Cota',
  falta_detalhe:    'Falta de Detalhe',
  nomenclatura:     'Nomenclatura',
  compatibilizacao: 'Compatibilização',
  outro:            'Outro',
}
const CAT_COLORS: Record<string, string> = {
  conflito_projeto: '#EF4444', incompletude: '#F97316', erro_cota: '#EAB308',
  falta_detalhe: '#3B82F6',   nomenclatura: '#8B5CF6', compatibilizacao: '#06B6D4',
  outro: '#6B7280',
}

/** ISO week label e.g. "26/06" from a date string */
function weekLabel(dateStr: string) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - d.getDay() + 1) // Monday of week
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function getDashboardStats(projectId: string): Promise<LiveDashboardData> {
  // Run all queries in parallel for speed
  const [drawingsRes, issuesRes, plotsRes, milestonesRes] = await Promise.all([
    supabase
      .from('drawings')
      .select('id, discipline_code, status, sent_at, updated_at, code, title, phase, designer_name, approved_at, revision, disciplines(name)')
      .eq('project_id', projectId)
      .order('sent_at', { ascending: false }),
    supabase
      .from('issues')
      .select('id, category, status, created_at')
      .in('drawing_id',
        // sub-select only drawing IDs of this project — avoids a join
        (await supabase.from('drawings').select('id').eq('project_id', projectId)).data?.map((d: {id: string}) => d.id) || []
      ),
    supabase
      .from('plot_orders')
      .select('id, status, is_current_version, copies')
      .eq('project_id', projectId),
    supabase
      .from('milestones')
      .select('id, status, planned_date')
      .eq('project_id', projectId),
  ])

  const drawings = drawingsRes.data || []
  const issues   = issuesRes.data   || []
  const plots    = plotsRes.data    || []
  const miles    = milestonesRes.data || []

  // ── KPI stats ──────────────────────────────────────────────────────────────
  const total      = drawings.length
  const approved   = drawings.filter((d: {status: string}) => d.status === 'aprovado').length
  const inReview   = drawings.filter((d: {status: string}) => d.status === 'em_analise').length
  const rejected   = drawings.filter((d: {status: string}) => d.status === 'rejeitado').length
  const liberado   = drawings.filter((d: {status: string}) => d.status === 'liberado_para_obra').length
  const openIssues = issues.filter((i: {status: string}) => i.status === 'aberto').length
  const resolvedIs = issues.filter((i: {status: string}) => i.status === 'resolvido').length
  const totalPlots = plots.reduce((sum: number, p: {copies: number}) => sum + (p.copies || 1), 0)
  const obsolete   = plots.filter((p: {is_current_version: boolean}) => !p.is_current_version).length
  const pending    = plots.filter((p: {status: string}) => p.status === 'solicitado').length
  const overdue    = miles.filter((m: {status: string}) => m.status === 'atrasado').length
  const concluded  = miles.filter((m: {status: string}) => m.status === 'concluido').length
  const onTimeRate = miles.length > 0
    ? Math.round(((miles.length - overdue) / miles.length) * 100)
    : 100

  const stats: import('../types').DashboardStats = {
    totalDrawings: total,
    approvedDrawings: approved,
    inReviewDrawings: inReview,
    rejectedDrawings: rejected,
    liberadoObra: liberado,
    totalIssues: issues.length,
    openIssues,
    resolvedIssues: resolvedIs,
    totalPlots,
    obsoletePlots: obsolete,
    pendingPlots: pending,
    overdueDeliverables: overdue,
    onTimeRate,
  }

  // ── Docs by discipline ─────────────────────────────────────────────────────
  const discCount: Record<string, number> = {}
  for (const d of drawings) {
    const code = (d as {discipline_code: string}).discipline_code || 'OUTRO'
    discCount[code] = (discCount[code] || 0) + 1
  }
  const docsByDiscipline: DisciplineChartItem[] = Object.entries(discCount)
    .sort(([, a], [, b]) => b - a)
    .map(([code, total]) => ({
      name: code,
      total,
      color: DISC_COLORS[code] || '#6B7280',
    }))

  // ── Docs by status ─────────────────────────────────────────────────────────
  const docsByStatus: StatusChartItem[] = [
    { name: 'Liberado Obra', value: liberado,  color: '#22C55E' },
    { name: 'Aprovado',      value: approved,  color: '#3B82F6' },
    { name: 'Em Análise',    value: inReview,  color: '#EAB308' },
    { name: 'Rejeitado',     value: rejected,  color: '#EF4444' },
  ].filter(s => s.value > 0)

  // ── Issues by category ─────────────────────────────────────────────────────
  const catCount: Record<string, number> = {}
  for (const i of issues) {
    const cat = (i as {category: string}).category || 'outro'
    catCount[cat] = (catCount[cat] || 0) + 1
  }
  const issuesByCategory: IssuesCategoryItem[] = Object.entries(catCount)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, value]) => ({
      name: CAT_LABELS[cat] || cat,
      value,
      color: CAT_COLORS[cat] || '#6B7280',
    }))

  // ── Weekly activity (last 5 weeks) ─────────────────────────────────────────
  const weekMap: Record<string, { novos: number; atualizados: number }> = {}
  const now = new Date()
  for (let w = 4; w >= 0; w--) {
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1 - w * 7)
    const label = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`
    weekMap[label] = { novos: 0, atualizados: 0 }
  }

  for (const d of drawings) {
    const sent = (d as {sent_at: string}).sent_at
    const updated = (d as {updated_at: string}).updated_at
    if (sent) {
      const wl = weekLabel(sent)
      if (weekMap[wl]) weekMap[wl].novos++
    }
    if (updated && updated !== sent) {
      const wl = weekLabel(updated)
      if (weekMap[wl]) weekMap[wl].atualizados++
    }
  }
  const weeklyActivity: WeeklyActivityItem[] = Object.entries(weekMap).map(([week, v]) => ({ week, ...v }))

  // ── Recent drawings (last 5) ───────────────────────────────────────────────
  const recentDrawings = drawings.slice(0, 5).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    projectId: projectId,
    code: d.code as string,
    discipline: ((d.disciplines as {name: string} | null)?.name) || d.discipline_code as string || '',
    disciplineCode: d.discipline_code as string || '',
    floor: '',
    type: '',
    number: '',
    revision: d.revision as string || '',
    phase: d.phase as Drawing['phase'],
    status: d.status as Drawing['status'],
    title: d.title as string || '',
    designerName: d.designer_name as string || '',
    sentAt: d.sent_at as string || '',
    updatedAt: d.updated_at as string || '',
    approvedAt: d.approved_at as string | undefined,
    isOriginal: true,
  } as Drawing))

  return { stats, docsByDiscipline, docsByStatus, issuesByCategory, weeklyActivity, recentDrawings }
}

