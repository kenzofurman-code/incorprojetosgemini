/**
 * types/cronograma.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tipos e interfaces para o Módulo de Cronograma Avançado:
 *  - EAP / WBS e Gráfico de Gantt
 *  - Visualização TABELAS com Múltiplas Visualizações (+ Visualização e [x] para excluir)
 *  - Múltiplas Tabelas Independentes por Visualização (+ Adicionar Tabela)
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
  listName?: string // Nome da lista / pacote / projeto (ex: "ALTA", "NATUNE", "PROJETOS", "BLOSSOM")
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

// ─── Visualizações da Aba TABELAS ──────────────────────────────────────────

export interface TableInstance {
  id: string
  title: string
  listName?: string // Filtro por Projeto/Lista (ex: "ALTA", "NATUNE", "PROJETOS", "TODOS")
  tagFilter?: string // Filtro por Tag (ex: "análise", "aprovação", "equilíbrio")
  statusFilter?: TaskStatus
  responsibleFilter?: string
  collapsed?: boolean
}

export interface CustomTableViewTab {
  id: string
  name: string
  icon?: string
  tables: TableInstance[]
  visibleColumns?: string[] // Colunas ativas nesta visualização
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
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
  data: string // YYYY-MM-DD ou ISO
  descricao: string
  status?: StatusProtocolo
  observacoes?: string
  autor?: string // ex: "Prefeitura Municipal de Curitiba", "SMMA", "Rafael Luiz de Medeiros"
  unidade?: string // ex: "SMU / UCE - Controle de Edificações", "SMMA"
  fase?: string // ex: "Em andamento", "Novo"
  situacao?: string // ex: "Aguardando resposta do solicitante", "Solicitação em análise"
  acaoNome?: string // ex: "Atender", "Visualizar", "Visualizar documento(s)"
  prazoAtendimento?: string // ex: "16 de outubro de 2026"
  apontamentosExigencias?: string[] // O que a prefeitura apontou/exigiu
  correcoesAtendidas?: string[] // O que foi corrigido/respondido
  documentosAnexados?: Array<{ nome: string; tamanho?: string; tipo?: string; url?: string }>
  fotosVistoria?: Array<{ nome: string; descricao?: string; tamanho?: string; url?: string }>
  parecerCompleto?: string
}

export interface ProtocoloItem {
  id: string
  numeroProtocolo: string
  orgao: OrgaoProtocolo
  nomeOrgao: string // ex: "Prefeitura Municipal de Curitiba", "CEMIG"
  tipoProcesso: string // ex: "Alvará de Construção", "Certificado de Conclusão de Obra (CVCO)"
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
  
  // Dados Específicos do Empreendimento & Imóvel
  empreendimentoNome?: string // ex: "Edifício Hall Design", "Obra Lior", "Blanc de Rouge"
  alvaraNumero?: string // ex: "389569"
  indicacaoFiscal?: string // ex: "32.027.026"
  responsavelTecnico?: string // ex: "Eng. Rafael Luiz de Medeiros - CREA PR-0000083501/D"
  areaVistoriada?: string // ex: "7.934,60 m²"
  totalPendencias?: number
  totalAprovacoes?: number
}

export type CronogramaMainTab = 'tabelas' | 'gantt' | 'kanban' | 'network' | 'protocolos'
