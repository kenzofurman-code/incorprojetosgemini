// Tipos que espelham as tabelas do supabase/schema.sql
// Use estes tipos para queries/inserts diretos ao Supabase.
// Os tipos "de domínio" em src/types/index.ts continuam sendo usados pela UI;
// as funções em src/lib/queries.ts fazem a ponte entre os dois.

export type DbDrawingStatus =
  | 'em_analise' | 'aprovado' | 'aprovado_com_ressalva'
  | 'liberado_para_obra' | 'rejeitado' | 'bloqueado' | 'desativado'

export type DbProjectPhase =
  | 'estudo_preliminar' | 'anteprojeto' | 'projeto_legal' | 'projeto_basico'
  | 'pre_executivo' | 'executivo' | 'liberado_para_obra' | 'as_built'

export type DbMilestoneStatus = 'no_prazo' | 'atrasado' | 'concluido' | 'a_vencer'
export type DbMilestonePriority = 'critico' | 'alto' | 'normal'

export interface DbProject {
  id: string
  name: string
  code: string
  address: string | null
  client: string | null
  total_floors: number
  basements: number
  start_date: string | null
  end_date: string | null
  status: 'ativo' | 'pausado' | 'concluido'
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface DbFloor {
  id: string
  project_id: string
  code: string
  name: string
  floor_order: number
}

export interface DbDiscipline {
  id: string
  code: string
  name: string
  color: string
}

export interface DbDrawing {
  id: string
  project_id: string
  code: string
  discipline_code: string
  floor_code: string
  doc_type: string | null
  number: string | null
  revision: string
  phase: DbProjectPhase
  status: DbDrawingStatus
  title: string | null
  pdf_url: string | null
  thumbnail_url: string | null
  designer_id: string | null
  designer_name: string | null
  is_original: boolean
  qr_code_data: string | null
  sent_at: string
  updated_at: string
  approved_at: string | null
  approved_by: string | null
  created_at: string
}

export interface DbDrawingVersion {
  id: string
  drawing_group_code: string
  drawing_id: string
  revision: string
  pdf_url: string | null
  sent_at: string
  status: DbDrawingStatus
  approved_at: string | null
  notes: string | null
}

export interface DbSchedule {
  id: string
  project_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface DbMilestone {
  id: string
  schedule_id: string
  project_id: string
  discipline_code: string
  phase: DbProjectPhase
  description: string
  planned_date: string
  actual_date: string | null
  status: DbMilestoneStatus
  responsible_id: string | null
  responsible_name: string | null
  construction_need: string | null
  priority: DbMilestonePriority
  created_at: string
}

export interface DbPlotOrder {
  id: string
  project_id: string
  drawing_id: string
  drawing_code: string | null
  drawing_revision: string | null
  is_current_version: boolean
  requested_by: string | null
  requested_by_name: string | null
  printed_by: string | null
  printed_at: string | null
  delivered_to: string | null
  delivered_at: string | null
  location: string | null
  copies: number
  format: 'A0' | 'A1' | 'A2' | 'A3' | 'A4'
  status: 'solicitado' | 'impresso' | 'entregue' | 'obsoleto'
  scanned_at: string | null
  notes: string | null
  created_at: string
}
