/**
 * types/cronograma.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tipos e interfaces para o Módulo de Cronograma Avançado:
 *  - EAP / WBS e Gráfico de Gantt
 *  - Dependências (FS, SS, FF, SF com lag em dias úteis)
 *  - Caminho Crítico (PERT / CPM) e Baseline
 *  - Vínculo com Entregáveis de Projetos
 *  - Acompanhamento de Protocolos em Órgãos Públicos
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

export interface ScheduleTask {
  id: string
  wbs: string // ex: "1", "1.1", "1.2.1"
  name: string
  startDate: string // ISO date YYYY-MM-DD
  endDate: string // ISO date YYYY-MM-DD
  durationDays: number // Duração em dias úteis
  progress: number // 0 a 100%
  status: TaskStatus
  responsible: string
  predecessors: TaskDependency[]
  successors?: string[]

  // Linha de Base (Baseline)
  baselineStart?: string
  baselineEnd?: string
  baselineDuration?: number

  // Visual e Organização
  tags?: string[]
  color?: string
  isGroup?: boolean // true para fases, lotes e pacotes sumários
  parentId?: string | null
  collapsed?: boolean // se o grupo está recolhido na timeline

  // Vínculo com Entregáveis de Projetos
  deliverableIds?: string[] // IDs de pranchas ou códigos de disciplina vinculados
  suggestedProgress?: number // % sugerido pelo motor de entregáveis

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

export type CronogramaViewMode = 'gantt' | 'kanban' | 'network' | 'protocolos'
