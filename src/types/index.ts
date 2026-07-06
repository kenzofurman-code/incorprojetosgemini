// ─── Disciplines / Specialties ───────────────────────────────────────────────
export type DisciplineCode =
  | 'ARQ' | 'EST' | 'ELE' | 'HID' | 'AR'
  | 'INC' | 'GAS' | 'FND' | 'TOP' | 'ARR'
  | 'AUT' | 'ELEV' | 'EXA' | 'INT' | 'PAI'

export interface Discipline {
  code: DisciplineCode | string
  name: string
  color: string
  icon?: string
}

// ─── Drawing / Prancha ───────────────────────────────────────────────────────
export type DrawingStatus =
  | 'em_analise'
  | 'aprovado'
  | 'aprovado_com_ressalva'
  | 'liberado_para_obra'
  | 'rejeitado'
  | 'bloqueado'
  | 'desativado'

export type ProjectPhase =
  | 'estudo_preliminar'
  | 'anteprojeto'
  | 'projeto_legal'
  | 'projeto_basico'
  | 'pre_executivo'
  | 'executivo'
  | 'liberado_para_obra'
  | 'as_built'

export interface Drawing {
  id: string
  projectId: string
  code: string             // e.g. "043-EP-ARQ-P03-PLA-002-R02"
  discipline: string
  disciplineCode: string
  floor: string            // e.g. "P03", "TER", "COB"
  type: string             // e.g. "PLA", "DET", "COR"
  number: string           // e.g. "002"
  revision: string         // e.g. "R00", "R01", "R05"
  phase: ProjectPhase
  status: DrawingStatus
  title: string
  pdfUrl?: string
  thumbnailUrl?: string
  designerName: string
  designerEmail?: string
  sentAt: string           // ISO date
  updatedAt: string
  approvedAt?: string
  approvedBy?: string
  isOriginal: boolean
  qrCodeData?: string
  qrCodeX?: number
  qrCodeY?: number
  qrCodePage?: number
  plotCount?: number
  versions?: DrawingVersion[]
}

export interface DrawingVersion {
  revision: string
  pdfUrl?: string
  sentAt: string
  status: DrawingStatus
  approvedAt?: string
  notes?: string
}

// ─── Review / Issues ─────────────────────────────────────────────────────────
export type IssueCategory =
  | 'conflito_projeto'
  | 'incompletude'
  | 'erro_cota'
  | 'falta_detalhe'
  | 'nomenclatura'
  | 'compatibilizacao'
  | 'outro'

export type IssueStatus = 'aberto' | 'em_revisao' | 'resolvido'

export interface Issue {
  id: string
  reviewId: string
  drawingId: string
  x: number              // percentage position on PDF page
  y: number
  pageNumber: number
  category: IssueCategory
  status: IssueStatus
  title: string
  description: string
  assignedTo?: string
  priority: 'alta' | 'media' | 'baixa'
  createdBy: string
  createdAt: string
  resolvedAt?: string
}

export interface Review {
  id: string
  drawingId: string
  drawingCode: string
  revision: string
  reviewerName: string
  startedAt: string
  completedAt?: string
  status: 'em_andamento' | 'concluido' | 'aprovado' | 'rejeitado'
  issues: Issue[]
  decision?: 'approve' | 'approve_with_notes' | 'reject'
  notes?: string
}

// ─── Schedule / Cronograma ───────────────────────────────────────────────────
export type MilestoneStatus = 'no_prazo' | 'atrasado' | 'concluido' | 'a_vencer'

export interface Milestone {
  id: string
  projectId: string
  disciplineCode: string
  phase: ProjectPhase
  description: string
  plannedDate: string
  actualDate?: string
  status: MilestoneStatus
  responsibleName: string
  constructionNeed?: string   // When is it needed on-site
  priority: 'critico' | 'alto' | 'normal'
}

export interface Schedule {
  id: string
  projectId: string
  name: string
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
}

// ─── Plot Orders / Plotagem ───────────────────────────────────────────────────
export type PlotStatus = 'solicitado' | 'impresso' | 'entregue' | 'obsoleto'

export interface PlotOrder {
  id: string
  drawingId: string
  drawingCode: string
  drawingRevision: string
  isCurrentVersion: boolean
  requestedBy: string
  printedBy?: string
  printedAt?: string
  deliveredTo?: string
  deliveredAt?: string
  location?: string           // Where on site
  copies: number
  format: 'A0' | 'A1' | 'A2' | 'A3' | 'A4'
  status: PlotStatus
  scannedAt?: string
  notes?: string
  projectId: string
}

// ─── Project ─────────────────────────────────────────────────────────────────
export interface Project {
  id: string
  name: string
  code: string             // e.g. "043"
  address: string
  client: string
  totalFloors: number
  basements: number
  startDate: string
  endDate?: string
  status: 'ativo' | 'pausado' | 'concluido'
  photoUrl?: string
  scheduleId?: string      // UUID of the linked schedule row
  disciplines: string[]   // array of discipline codes active
  floors: Floor[]
}

export interface Floor {
  id: string
  code: string            // e.g. "TER", "P01", "SS1", "COB"
  name: string            // e.g. "Terreo", "1º Pavimento"
  order: number           // for vertical sorting
}

// ─── User ────────────────────────────────────────────────────────────────────
export type UserRole = 'coordenador' | 'projetista' | 'fiscal_obra' | 'admin'

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  group: 'escritorio' | 'obra'
  avatarUrl?: string
  company?: string
  disciplines?: string[]
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
export interface DashboardStats {
  totalDrawings: number
  approvedDrawings: number
  inReviewDrawings: number
  rejectedDrawings: number
  liberadoObra: number
  totalIssues: number
  openIssues: number
  resolvedIssues: number
  totalPlots: number
  obsoletePlots: number
  pendingPlots: number
  overdueDeliverables: number
  onTimeRate: number
}
