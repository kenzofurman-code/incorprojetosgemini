/**
 * components/viabilidade/tabs/Tab04Cronograma.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Aba 4: Cronograma & Grafo de Marcos:
 *  - Marcos de aprovação, registro de incorporação (RI) e lançamento
 *  - Início e duração da obra de construção civil
 *  - Conclusão, Habite-se (CVCO) e entrega das chaves
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react'
import { Calendar, Clock, Flag, CheckCircle, Hammer, Key } from 'lucide-react'
import type { ViabilityStudyModel, MilestoneGraphModel } from '../../../types/viabilidade'

interface Tab04CronogramaProps {
  study: ViabilityStudyModel
  onUpdateMilestones: (milestones: MilestoneGraphModel) => void
}

export default function Tab04Cronograma({
  study,
  onUpdateMilestones,
}: Tab04CronogramaProps) {
  const { milestones } = study

  const handleChange = (field: keyof MilestoneGraphModel, value: number) => {
    const updated = {
      ...milestones,
      [field]: value,
    }

    // Recalcula datas automáticas dependentes se necessário
    if (field === 'constructionStartMonth' || field === 'constructionDurationMonths') {
      const start = field === 'constructionStartMonth' ? value : updated.constructionStartMonth
      const dur = field === 'constructionDurationMonths' ? value : updated.constructionDurationMonths
      updated.completionHabiteSeMonth = start + dur
      updated.keysDeliveryMonth = start + dur + 2
      updated.totalProjectMonths = Math.max(updated.keysDeliveryMonth + 2, updated.totalProjectMonths)
    }

    onUpdateMilestones(updated)
  }

  const milestonesList = [
    { label: 'Briefing e Estudos Iniciais', field: 'projectBriefingMonth' as const, icon: Clock, color: 'text-slate-400' },
    { label: 'Aprovação do Projeto Legal', field: 'legalApprovalMonth' as const, icon: Flag, color: 'text-blue-400' },
    { label: 'Emissão do Alvará de Construção', field: 'permitMonth' as const, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Registro de Incorporação (RI)', field: 'incorporationRegistryMonth' as const, icon: Flag, color: 'text-purple-400' },
    { label: 'Lançamento Comercial', field: 'launchMonth' as const, icon: Flag, color: 'text-orange-400' },
    { label: 'Início Efetivo da Obra', field: 'constructionStartMonth' as const, icon: Hammer, color: 'text-yellow-400' },
    { label: 'Conclusão de Obra e Habite-se (CVCO)', field: 'completionHabiteSeMonth' as const, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Entrega das Chaves aos Clientes', field: 'keysDeliveryMonth' as const, icon: Key, color: 'text-orange-400' },
  ]

  return (
    <div className="space-y-6">
      {/* ── 1. Painel de Prazos Principais ──────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Calendar size={16} className="text-orange-400" />
          <span>Prazos Centrais do Empreendimento</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-yellow-300 mb-1">
              Duração da Obra (Meses)
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Período de execução física da construção civil.
            </p>
            <input
              type="number"
              value={milestones.constructionDurationMonths || 24}
              onChange={e => handleChange('constructionDurationMonths', parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-yellow-400 font-mono font-bold text-sm focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-orange-300 mb-1">
              Mês de Lançamento Comercial
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Mês em que se inicia a venda das unidades aos clientes.
            </p>
            <input
              type="number"
              value={milestones.launchMonth || 8}
              onChange={e => handleChange('launchMonth', parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-orange-400 font-mono font-bold text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-blue-300 mb-1">
              Duração Total do Ciclo (Meses)
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Do briefing inicial até o encerramento do repasse e garantias.
            </p>
            <input
              type="number"
              value={milestones.totalProjectMonths || 38}
              onChange={e => handleChange('totalProjectMonths', parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-blue-400 font-mono font-bold text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── 2. Grafo Sequencial de Marcos (Mês 1 a N) ────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Flag size={16} className="text-emerald-400" />
          <span>Sequenciamento Temporal dos Marcos (Mês no Fluxo)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestonesList.map((mItem, idx) => {
            const Icon = mItem.icon
            return (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Icon size={14} className={mItem.color} />
                  <span>{mItem.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Mês:</span>
                  <input
                    type="number"
                    value={milestones[mItem.field] || ''}
                    onChange={e => handleChange(mItem.field, parseInt(e.target.value, 10) || 1)}
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs focus:border-orange-500 focus:outline-none text-center"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
