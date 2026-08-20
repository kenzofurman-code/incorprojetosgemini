import React from 'react'
import { Landmark, DollarSign, Percent, ShieldCheck, HelpCircle } from 'lucide-react'
import type { ViabilityStudyModel, FinancingModel, ViabilityMetrics } from '../../../types/viabilidade'
import { formatCurrency } from '../../../utils/formatters'

interface Tab07FinanciamentoProps {
  study: ViabilityStudyModel
  metrics: ViabilityMetrics
  onUpdateFinancing: (financing: FinancingModel) => void
}

export default function Tab07Financiamento({
  study,
  metrics,
  onUpdateFinancing,
}: Tab07FinanciamentoProps) {
  const { financing } = study

  const handleChange = (field: keyof FinancingModel, value: any) => {
    onUpdateFinancing({
      ...financing,
      [field]: value,
    })
  }

  const estimatedLimit = (metrics.totalConstructionCost * (financing.maxFinancingPctOfConstruction || 70)) / 100

  return (
    <div className="space-y-6">
      {/* ── 1. Status do Financiamento & Modalidade ─────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Landmark size={16} className="text-blue-400" />
            <span>Linha de Financiamento Bancário à Produção (PJ)</span>
          </h3>

          {/* Toggle Ativar / Desativar */}
          <button
            onClick={() => handleChange('enabled', !financing.enabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              financing.enabled
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${financing.enabled ? 'bg-blue-400' : 'bg-slate-500'}`} />
            <span>{financing.enabled ? 'Financiamento Ativo' : '100% Capital Próprio'}</span>
          </button>
        </div>

        {financing.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Modalidade de Crédito
              </label>
              <select
                value={financing.facilityType}
                onChange={e => handleChange('facilityType', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="caixa_apoio_producao">CAIXA - Apoio à Produção</option>
                <option value="plano_empresario_banco">Plano Empresário (Banco Privado)</option>
                <option value="cri_direct">Emissão de CRI / Direto</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cobertura da Obra (%)
              </label>
              <input
                type="number"
                step="5"
                value={financing.maxFinancingPctOfConstruction || 70}
                onChange={e => handleChange('maxFinancingPctOfConstruction', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-blue-400 font-mono font-bold text-xs focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Limite: ~ {formatCurrency(estimatedLimit)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Taxa de Juros Anual (% a.a.)
              </label>
              <input
                type="number"
                step="0.1"
                value={financing.annualInterestRatePct || 11.8}
                onChange={e => handleChange('annualInterestRatePct', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-xs focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Juros durante a obra</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Carência da Amortização (Meses)
              </label>
              <input
                type="number"
                value={financing.gracePeriodMonths || 24}
                onChange={e => handleChange('gracePeriodMonths', parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Até a entrega das chaves</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Resumo de Impacto do Financiamento ────────────────────────────── */}
      {financing.enabled && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Demonstrativo do Financiamento & Impacto no Capital Próprio</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-xs text-slate-400">Total de Financiamento Captado</div>
              <div className="text-base font-bold text-blue-400 font-mono mt-1">
                {formatCurrency(estimatedLimit)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Liberação gradual mensal por medição física
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-xs text-slate-400">Total de Juros & Encargos de Obra</div>
              <div className="text-base font-bold text-red-400 font-mono mt-1">
                {formatCurrency(metrics.totalFinancingInterestCost)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Incidência mensal sobre saldo devedor
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-xs text-slate-400">Exposição Líquida de Capital Próprio</div>
              <div className="text-base font-bold text-yellow-400 font-mono mt-1">
                {formatCurrency(metrics.maxCashExposure)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Reduzida pela alavancagem bancária
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
