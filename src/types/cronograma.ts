/**
 * types/cronograma.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tipos e interfaces para o Módulo de Cronograma Avançado:
 *  - EAP / WBS e Gráfico de Gantt
 *  - Visualização Multi-Tabelas estilo ClickUp com Seleção de Colunas e Filtros
 *  - Múltiplas Visualizações Customizadas no Topo (+ Visualização)
 *  - Dependências (FS, SS, FF, SF com lag em dias úteis)
 *  - Caminho Crítico (PERT / CPM) e Baseline
 *  - Vínculo com Entregáveis de Projetos
 *  - Acompanhamento de Protocolos em Órgãos Públicos
 *  - Campos Customizados e Modal Estilo Pipefy para Kanban
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'

export interface TaskDependency {
  taskId: string
  type: DependencyType
  lagDays?: number // Atraso/adiantamento em dias úteis (ex: +2d ou -1d)
}

export type TaskStatus =
  | 'nao_iniciado'
  | 'em_andamento'
  | 'em_revisao'
  | 'concluido'
  | 'bloqueado'

export type TaskPriority = 'urgente' | 'alta' | 'normal' | 'baixa'

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'user'

export interface CustomFieldDefinition {
  id: string
  label: string
  type: CustomFieldType
  options?: string[] // Para selects
  bucket?: TaskStatus | 'global' // 'global' (formulário padrão) ou específico de uma fase/bucket
  placeholder?: string
  required?: boolean
}

export interface TaskChecklistItem {
  id: string
  title: string
  completed: boolean
}

export interface TaskComment {
  id: string
  author: string
  avatar?: string
  text: string
  createdAt: string
}

export interface TaskAttachment {
  id: string
  name: string
  size?: string
  url?: string
  uploadedAt: string
}

export interface TaskPhaseChangeLog {
  fromStatus: TaskStatus
  toStatus: TaskStatus
  changedAt: string
  changedBy?: string
}

export interface ScheduleTask {
  id: string
  wbs: string // ex: "1", "1.1", "1.2.1"
  name: string
  description?: string
  startDate: string // ISO date YYYY-MM-DD
  endDate: string // ISO date YYYY-MM-DD
  durationDays: number // Duração em dias úteis
  progress: number // 0 a 100%
  status: TaskStatus
  priority?: TaskPriority // Prioridade da tarefa (Urgente, Alta, Normal, Baixa)
  responsible: string
  listName?: string // Nome da lista / pacote / projeto (ex: "ALTA", "NATUNE", "PROJETOS")
  predecessors: TaskDependency[]
  successors?: string[]

  // Linha de Base (Baseline)
  baselineStart?: string
  baselineEnd?: string
  baselineDuration?: number

  // Visual e Organização
  tags?: string[] // Etiquetas (ex: ["análise", "equilíbrio", "aprovação"])
  color?: string
  isGroup?: boolean // true para fases, lotes e pacotes sumários
  parentId?: string | null
  collapsed?: boolean // se o grupo está recolhido na timeline

  // Vínculo com Entregáveis de Projetos
  deliverableIds?: string[] // IDs de pranchas ou códigos de disciplina vinculados
  suggestedProgress?: number // % sugerido pelo motor de entregáveis

  // Campos Customizados Estilo Pipefy
  customFields?: Record<string, any>
  checklist?: TaskChecklistItem[]
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
  phaseHistory?: TaskPhaseChangeLog[]

  // CPM / PERT (Cálculo de Caminho Crítico)
  isMilestone?: boolean
  critical?: boolean
  earlyStart?: string
  earlyFinish?: string
  lateStart?: string
  lateFinish?: string
  totalFloat?: number // Folga total em dias úteis
  freeFloat?: number // Folga livre
}

// ─── Visualizações Customizadas & Tabelas ──────────────────────────────────

export type ViewFormat = 'tabela' | 'gantt' | 'kanban' | 'network' | 'protocolos' | 'timeline'

export type TableGroupBy = 'tags' | 'status' | 'responsible' | 'listName' | 'none'

export interface TableColumnConfig {
  id: string
  key: string
  label: string
  visible: boolean
  width?: number
  sortable?: boolean
}

export interface TableGroupSection {
  id: string
  title: string
  tagFilter?: string
  statusFilter?: TaskStatus
  responsibleFilter?: string
  listFilter?: string
  collapsed?: boolean
}

export interface CronogramaCustomView {
  id: string
  name: string
  icon?: string
  format: ViewFormat
  isDefault?: boolean
  responsibleFilter?: string // Ex: apenas tarefas da Isabele, Alana, etc.
  tagFilter?: string // Ex: apenas tarefas com tag [equilíbrio]
  groupBy?: TableGroupBy
  visibleColumns?: string[] // IDs das colunas ativas
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  filters?: {
    tags?: string[]
    status?: TaskStatus[]
    responsible?: string[]
    priority?: TaskPriority[]
    searchQuery?: string
  }
  customSections?: TableGroupSection[]
}

// ─── Protocolos & Órgãos Públicos ──────────────────────────────────────────

export type OrgaoProtocolo =
  | 'prefeitura'
  | 'bombeiros'
  | 'concessionaria_energia'
  | 'concessionaria_agua'
  | 'ambiental'
  | 'cartorio'
  | 'outro'

export type StatusProtocolo =
  | 'em_analise'
  | 'com_exigencia'
  | 'aprovado'
  | 'indeferido'
  | 'arquivado'

export interface MovimentacaoProtocolo {
  id: string
  data: string // YYYY-MM-DD
  descricao: string
  status?: StatusProtocolo
  observacoes?: string
}

export interface ProtocoloItem {
  id: string
  numeroProtocolo: string
  orgao: OrgaoProtocolo
  nomeOrgao: string // ex: "Prefeitura Municipal de Belo Horizonte", "CEMIG"
  tipoProcesso: string // ex: "Alvará de Construção", "Projeto de Prevenção a Incêndio (AVCB)"
  dataEntrada: string // YYYY-MM-DD
  prazoEstimado?: string // YYYY-MM-DD
  status: StatusProtocolo
  ultimaMovimentacao?: string
  descricaoUltimaMovimentacao?: string
  linkConsulta?: string
  historico: MovimentacaoProtocolo[]
  responsavel?: string
  taskId?: string // Vinculado à tarefa correspondente da EAP
  observacoes?: string
}

export type CronogramaViewMode = 'tabela' | 'gantt' | 'kanban' | 'network' | 'protocolos' | string
