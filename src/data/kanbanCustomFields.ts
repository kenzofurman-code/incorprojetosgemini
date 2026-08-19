/**
 * data/kanbanCustomFields.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Definições padrão de campos globais e específicos por bucket/fase do Kanban
 * estilo Pipefy.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CustomFieldDefinition } from '../types/cronograma'

export const DEFAULT_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  // ── Campos Globais (Formulário Padrão) ──
  {
    id: 'centro_custo',
    label: 'Centro de Custo / Empreendimento',
    type: 'select',
    options: ['Projetos & Incorporação', 'Engenharia Estrutural', 'Instalações MEPR', 'Legalização & Alvarás', 'BIM & Coordenação'],
    bucket: 'global',
    placeholder: 'Selecione o centro de custo',
  },
  {
    id: 'software_utilizado',
    label: 'Software / Plataforma Utilizada',
    type: 'select',
    options: ['Autodesk Revit', 'AutoCAD 2026', 'TQS / Eberick', 'Navisworks Manage', 'Solibri Model Checker', 'QGIS / Topografia'],
    bucket: 'global',
  },
  {
    id: 'custo_previsto',
    label: 'Orçamento Previsto (R$)',
    type: 'currency',
    bucket: 'global',
    placeholder: 'R$ 0,00',
  },

  // ── Campos Específicos: A Fazer (nao_iniciado) ──
  {
    id: 'briefing_aprovado',
    label: 'Briefing e Escopo Alinhados com Cliente?',
    type: 'checkbox',
    bucket: 'nao_iniciado',
  },
  {
    id: 'prazo_ideal_entrega',
    label: 'Prazo Ideal de Entrega da R00',
    type: 'date',
    bucket: 'nao_iniciado',
  },

  // ── Campos Específicos: Em Andamento (em_andamento) ──
  {
    id: 'horas_trabalhadas',
    label: 'Horas Técnicas Apontadas',
    type: 'number',
    bucket: 'em_andamento',
    placeholder: 'Ex: 40',
  },
  {
    id: 'impedimentos_tecnicos',
    label: 'Impedimentos / Dúvidas de Projeto',
    type: 'textarea',
    bucket: 'em_andamento',
    placeholder: 'Descreva eventuais interferências ou dúvidas pendentes...',
  },

  // ── Campos Específicos: Em Revisão (em_revisao) ──
  {
    id: 'revisor_responsavel',
    label: 'Engenheiro / Arquiteto Revisor',
    type: 'text',
    bucket: 'em_revisao',
    placeholder: 'Ex: Coordenador BIM Carlos',
  },
  {
    id: 'clashes_detectados',
    label: 'Interferências / Conflitos Detectados',
    type: 'number',
    bucket: 'em_revisao',
    placeholder: 'Ex: 2',
  },
  {
    id: 'parecer_tecnico',
    label: 'Parecer da Revisão Técnica',
    type: 'select',
    options: ['Aprovado sem ressalvas', 'Aprovado com exigências pontuais', 'Rejeitado - Necessita reemissão'],
    bucket: 'em_revisao',
  },

  // ── Campos Específicos: Concluído (concluido) ──
  {
    id: 'data_efetiva_aprovacao',
    label: 'Data Efetiva de Aprovação e Liberação',
    type: 'date',
    bucket: 'concluido',
  },
  {
    id: 'link_repositorio_final',
    label: 'Link da Pasta / Repositório das Pranchas Finais',
    type: 'text',
    bucket: 'concluido',
    placeholder: 'https://...',
  },

  // ── Campos Específicos: Bloqueado (bloqueado) ──
  {
    id: 'motivo_bloqueio',
    label: 'Motivo do Bloqueio / Paralisação',
    type: 'select',
    options: ['Aguardando aprovação de órgão público', 'Pendência de pagamento de fornecedor', 'Aguardando definição do cliente', 'Incompatibilidade técnica grave'],
    bucket: 'bloqueado',
  },
  {
    id: 'acao_desbloqueio',
    label: 'Ação Necessária para Desbloqueio',
    type: 'textarea',
    bucket: 'bloqueado',
    placeholder: 'Qual ação precisa ocorrer para retomar a atividade?',
  },
]
