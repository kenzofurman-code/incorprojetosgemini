/**
 * components/viabilidade/ViabilidadeKpiCards.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Cards de Indicadores-Chave (KPIs) de Viabilidade no Topo:
 *  - VGV Líquido
 *  - Lucro Líquido & Margem %
 *  - Exposição Máxima de Caixa (Pico de Capital) & Mês
 *  - TIR Anual do Projeto (% a.a.)
 *  - VPL (Valor Presente Líquido @ TMA)
 *  - Mês de Payback
 * Cada card possui Tooltip no hover e abre o Lineage Drawer no clique.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react'
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Percent,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import type { ViabilityMetrics } from '../../types/viabilidade'
import { formatCurrency } from '../../utils/formatters'
import LineageTooltip from './LineageTooltip'

interface ViabilidadeKpiCardsProps {
  metrics: ViabilityMetrics
  onInspectMetric: (metricKey: keyof ViabilityMetrics) => void
}

export default function ViabilidadeKpiCards({
  metrics,
  onInspectMetric,
}: ViabilidadeKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. VGV Líquido */}
      <div
        onClick={() => onInspectMetric('netVgv')}
        className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-orange-500/50 transition-all cursor-pointer group shadow-lg"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">VGV Líquido</span>
          <LineageTooltip
            formula="VGV_Bruto - Permuta_Física_VGV"
            source="Aba 3. Produto & 2. Terreno"
          />
        </div>
        <div className="text-base sm:text-lg font-extrabold text-white font-mono group-hover:text-orange-400 transition-colors">
          {formatCurrency(metrics.netVgv)}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 truncate">
          Bruto: {formatCurrency(metrics.grossVgv)}
        </div>
      </div>

      {/* 2. Lucro Líquido & Margem */}
      <div
        onClick={() => onInspectMetric('netProfit')}
        className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-lg"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Lucro Líquido</span>
          <LineageTooltip
            formula="Receitas - Custo_Total_Empreendimento"
            source="DRE Consolidada"
          />
        </div>
        <div className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono">
          {formatCurrency(metrics.netProfit)}
        </div>
        <div className="text-[10px] text-emerald-300/80 font-bold mt-1">
          Margem: {metrics.netMarginPct.toFixed(1)}% do VGV
        </div>
      </div>

      {/* 3. Exposição Máxima de Caixa */}
      <div
        onClick={() => onInspectMetric('maxCashExposure')}
        className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-red-500/50 transition-all cursor-pointer group shadow-lg"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Exposição Máxima</span>
          <LineageTooltip
            formula="| Min ( Saldo_Acumulado_Mês_1..N ) |"
            source="Aba 8. Fluxo Mensal"
          />
        </div>
        <div className="text-base sm:text-lg font-extrabold text-red-400 font-mono">
          {formatCurrency(metrics.maxCashExposure)}
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          Pico no <strong className="text-slate-200 font-semibold">Mês {metrics.maxExposureMonth}</strong>
        </div>
      </div>

      {/* 4. TIR Anual do Projeto */}
      <div
        onClick={() => onInspectMetric('projectAnnualIrrPct')}
        className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group shadow-lg"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">TIR do Projeto</span>
          <LineageTooltip
            formula="(1 + TIR_Mensal)^12 - 1"
            source="Fluxo Líquido Mensal"
          />
        </div>
        <div className="text-base sm:text-lg font-extrabold text-purple-400 font-mono">
          {metrics.projectAnnualIrrPct.toFixed(1)}% <span className="text-xs font-normal">a.a.</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          Mensal: {metrics.projectMonthlyIrrPct.toFixed(2)}% a.m.
        </div>
      </div>

      {/* 5. VPL @ TMA */}
      <div
        onClick={() => onInspectMetric('npvAtTma')}
        className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group shadow-lg"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">VPL (@ TMA 12%)</span>
          <LineageTooltip
            formula="∑ [ Fluxo_t / (1 + TMA)^t ]"
            source="TMA Parametrizada"
          />
        </div>
        <div className="text-base sm:text-lg font-extrabold text-blue-400 font-mono">
          {formatCurrency(metrics.npvAtTma)}
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          {metrics.npvAtTma > 0 ? 'Gera Valor Econômico' : 'Abaixo da TMA'}
        </div>
      </div>

      {/* 6. Payback */}
      <div
        onClick={() => onInspectMetric('maxCashExposure')}
        className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-yellow-500/50 transition-all cursor-pointer group shadow-lg"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Payback</span>
          <LineageTooltip
            formula="Mês em que Saldo Acumulado >= 0"
            source="Curva de Retorno"
          />
        </div>
        <div className="text-base sm:text-lg font-extrabold text-yellow-400 font-mono">
          Mês {metrics.paybackMonth}
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          Retorno do capital próprio
        </div>
      </div>
    </div>
  )
}
