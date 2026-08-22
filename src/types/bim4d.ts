/**
 * Tipagens do Módulo de Simulação e Planejamento Construtivo BIM 4D
 * IncorProjetos - That Open Engine + Cronograma Executivo de Obra
 */

export interface AtividadeObra4D {
  id: string
  eap?: string              // ex: "1.1", "2.1.3"
  nome: string             // ex: "Estrutura - Pilares e Vigas 2º Pavimento"
  dataInicio: string       // Formato ISO: "2026-09-01"
  dataFim: string          // Formato ISO: "2026-09-20"
  pavimentoAlvo?: string   // ex: "2º Pavimento"
  corPersonalizada?: string// Hex code para cor de destaque durante obra
  bimGuids: string[]       // GlobalIds únicos do IFC vinculados
  bimExpressIds: number[]  // IDs numéricos no motor Fragments para alta performance
}

export interface CronogramaObra4D {
  id: string
  nome: string             // ex: "Cronograma Executivo - Edifício Piemonte"
  atividades: AtividadeObra4D[]
  versao: number
  dataCriacao: string
  dataAtualizacao: string
}

export interface BIMElementItem {
  expressId: number
  guid: string
  category: string        // ex: "IfcColumn", "IfcSlab", "IfcWall"
  name: string            // ex: "Pilar 20x50 P-04"
  storey: string          // ex: "1º Pavimento", "Subsolo"
  material?: string       // ex: "Concreto Armado C30"
  linkedActivityId?: string
}

export interface BIMElementGroup {
  id: string
  storey: string
  category: string
  categoryLabel: string
  items: BIMElementItem[]
  count: number
  expressIds: number[]
  guids: string[]
  isLinked: boolean
  linkedActivityName?: string
}

export type BIM4DTimeScale = 'mensal' | 'semanal' | 'diario'

export interface BIM4DPlayerState {
  currentDate: string     // ISO "2026-09-15"
  isPlaying: boolean
  speed: number           // 1 = 1x, 2 = 2x, 5 = 5x, 10 = 10x
  timeScale: BIM4DTimeScale
  startDate: string
  endDate: string
  progressPercent: number
  activeActivitiesCount: number
  completedActivitiesCount: number
}
