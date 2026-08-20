/**
 * components/viabilidade/tabs/Tab09Cenarios.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Aba 9: Cenários & Matriz de Sensibilidade:
 *  - Comparador Lado a Lado: Cenário Base vs Conservador vs Otimista
 *  - Matriz de Sensibilidade Calorífica Bidimensional: Preço de Venda × Custo de Obra
 *  - Análise de impacto instantâneo em TIR, VPL, Lucro e Exposição de Caixa
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo, useState } from 'react'
import { Sliders, TrendingUp, Grid, ShieldAlert, Sparkles } from 'lucide-react'
import type {
  ViabilityStudyModel,
  ViabilityMetrics,
  ViabilityScenarioOverride,
} from '../../../types/viabilidade'
import { calculateViabilityStudy } from '../../../lib/viabilidade/viabilidadeEngine'
import { formatCurrency } from '../../../utils/formatters'

interface Tab09CenariosProps {
  study: ViabilityStudyModel
  baseMetrics: ViabilityMetrics
}

const PREDEFINED_SCENARIOS: ViabilityScenarioOverride[] = [
  {
    id: 'base',
    name: 'base',
    label: 'Cenário Base (Oficial)',
    priceAdjustmentPct: 0,
    costAdjustmentPct: 0,
    vsoAdjustmentPct: 0,
    constructionDelayMonths: 0,
  },
  {
    id: 'conservador',
    name: 'conservador',
    label: 'Cenário Conservador (Stress Test)',
    priceAdjustmentPct: -5,
    costAdjustmentPct: 8,
    vsoAdjustmentPct: -20,
    constructionDelayMonths: 2,
  },
  {
    id: 'otimista',
    name: 'otimista',
    label: 'Cenário Otimista (Upside)',
    priceAdjustmentPct: 5,
    costAdjustmentPct: -5,
    vsoAdjustmentPct: 15,
    constructionDelayMonths: 0,
  },
]

export default function Tab09Cenarios({ study, baseMetrics }: Tab09CenariosProps) {
  // 1. Simulação dos 3 Cenários Padrão
  const scenarioResults = useMemo(() => {
    return PREDEFINED_SCENARIOS.map(sc => {
      const res = calculateViabilityStudy(study, sc)
      return {
        scenario: sc,
        metrics: res.metrics,
      }
    })
  }, [study])

  // 2. Matriz de Sensibilidade Bidimensional (Preço de Venda x Custo de Obra)
  const priceDeltas = [-10, -5, 0, 5, 10]
  const costDeltas = [-10, -5, 0, 5, 10]

  const sensitivityMatrix = useMemo(() => {
    const grid: {
      priceDelta: number
      costDelta: number
      irr: number
      profit: number
      margin: number
    }[][] = []

    for (const pDelta of priceDeltas) {
      const row: (typeof grid)[0] = []
      for (const cDelta of costDeltas) {
        const scOverride: ViabilityScenarioOverride = {
          id: `sens-${pDelta}-${cDelta}`,
          name: 'custom',
          label: `P:${pDelta}% C:${cDelta}%`,
          priceAdjustmentPct: pDelta,
          costAdjustmentPct: cDelta,
          vsoAdjustmentPct: 0,
          constructionDelayMonths: 0,
        }

        const res = calculateViabilityStudy(study, scOverride)
        row.push({
          priceDelta: pDelta,
          costDelta: cDelta,
          irr: res.metrics.projectAnnualIrrPct,
          profit: res.metrics.netProfit,
          margin: res.metrics.netMarginPct,
        })
      }
      grid.push(row)
    }

    return grid
  }, [study])

  const [sensitivityMetricView, setSensitivityMetricView] = useState<'irr' | 'profit' | 'margin'>('irr')

  return (
    <div className="space-y-6">
      {/* ── 1. Comparador de Cenários Lado a Lado ────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders size={16} className="text-orange-400" />
          <span>Comparativo de Cenários: Base vs. Conservador vs. Otimista</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarioResults.map(({ scenario, metrics }) => {
            const isBase = scenario.name === 'base'
            const isConservative = scenario.name === 'conservador'

            return (
              <div
                key={scenario.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isBase
                    ? 'bg-slate-950/90 border-orange-500/40 shadow-lg shadow-orange-500/5'
                    : isConservative
                    ? 'bg-slate-950/70 border-slate-800 hover:border-yellow-500/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-white">{scenario.label}</span>
                  {isBase && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/20 text-orange-400">
                      Oficial
                    </span>
                  )}
                </div>

                {/* Parâmetros do Cenário */}
                <div className="text-[11px] text-slate-400 space-y-1 mb-4 font-mono bg-slate-900/60 p-2.5 rounded-xl">
                  <div>Preço: <strong className="text-white">{scenario.priceAdjustmentPct > 0 ? `+${scenario.priceAdjustmentPct}%` : `${scenario.priceAdjustmentPct}%`}</strong></div>
                  <div>Custo Obra: <strong className="text-white">{scenario.costAdjustmentPct > 0 ? `+${scenario.costAdjustmentPct}%` : `${scenario.costAdjustmentPct}%`}</strong></div>
                  <div>Velocidade VSO: <strong className="text-white">{scenario.vsoAdjustmentPct > 0 ? `+${scenario.vsoAdjustmentPct}%` : `${scenario.vsoAdjustmentPct}%`}</strong></div>
                  <div>Atraso Obra: <strong className="text-white">{scenario.constructionDelayMonths} meses</strong></div>
                </div>

                {/* Métricas do Cenário */}
                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">VGV Líquido:</span>
                    <strong className="text-white">{formatCurrency(metrics.netVgv)}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Lucro Líquido:</span>
                    <strong className={metrics.netProfit > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatCurrency(metrics.netProfit)}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Margem Líquida:</span>
                    <strong className="text-slate-200">{metrics.netMarginPct.toFixed(1)}%</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Exposição Máxima:</span>
                    <strong className="text-red-400">{formatCurrency(metrics.maxCashExposure)}</strong>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-slate-800">
                    <span className="text-slate-400 font-sans">TIR do Projeto:</span>
                    <strong className="text-purple-400 text-sm">{metrics.projectAnnualIrrPct.toFixed(1)}% a.a.</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">VPL (@ TMA 12%):</span>
                    <strong className="text-blue-400">{formatCurrency(metrics.npvAtTma)}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Payback:</span>
                    <strong className="text-yellow-400">Mês {metrics.paybackMonth}</strong>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 2. Matriz de Sensibilidade Calorífica Bidimensional ──────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Grid size={16} className="text-emerald-400" />
              <span>Matriz de Sensibilidade Calorífica: Preço de Venda × Custo de Construção</span>
            </h3>
            <p className="text-xs text-slate-400">
              Variação cruzada simultânea de receita e desembolso de engenharia
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSensitivityMetricView('irr')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                sensitivityMetricView === 'irr' ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              TIR (% a.a.)
            </button>
            <button
              onClick={() => setSensitivityMetricView('profit')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                sensitivityMetricView === 'profit' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Lucro Líquido
            </button>
            <button
              onClick={() => setSensitivityMetricView('margin')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                sensitivityMetricView === 'margin' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Margem (%)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                <th className="p-2.5 text-left border border-slate-800">Preço \ Custo Obra</th>
                {costDeltas.map(c => (
                  <th key={c} className="p-2.5 border border-slate-800">
                    Custo {c > 0 ? `+${c}%` : `${c}%`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivityMatrix.map((row, pIdx) => {
                const pDelta = priceDeltas[pIdx]
                return (
                  <tr key={pIdx}>
                    <td className="p-2.5 text-left font-bold text-white bg-slate-950/80 border border-slate-800 whitespace-nowrap">
                      Preço {pDelta > 0 ? `+${pDelta}%` : `${pDelta}%`}
                    </td>

                    {row.map((cell, cIdx) => {
                      const isBaseCell = pDelta === 0 && costDeltas[cIdx] === 0

                      // Color coding
                      let bgClass = 'bg-slate-900/60'
                      let textClass = 'text-white'

                      if (sensitivityMetricView === 'irr') {
                        if (cell.irr >= 20) {
                          bgClass = 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-800/40'
                          textClass = 'text-emerald-300 font-bold'
                        } else if (cell.irr >= 12) {
                          bgClass = 'bg-blue-950/50 hover:bg-blue-900/70 border-blue-800/40'
                          textClass = 'text-blue-300 font-bold'
                        } else if (cell.irr > 0) {
                          bgClass = 'bg-yellow-950/50 hover:bg-yellow-900/70 border-yellow-800/40'
                          textClass = 'text-yellow-300'
                        } else {
                          bgClass = 'bg-red-950/60 hover:bg-red-900/80 border-red-800/40'
                          textClass = 'text-red-400 font-bold'
                        }
                      } else {
                        if (cell.profit > 0) {
                          bgClass = 'bg-emerald-950/50 hover:bg-emerald-900/70 border-emerald-800/30'
                          textClass = 'text-emerald-300 font-semibold'
                        } else {
                          bgClass = 'bg-red-950/60 hover:bg-red-900/80 border-red-800/40'
                          textClass = 'text-red-400 font-bold'
                        }
                      }

                      return (
                        <td
                          key={cIdx}
                          className={`p-3 border border-slate-800 transition-colors ${bgClass} ${
                            isBaseCell ? 'ring-2 ring-orange-400 z-10' : ''
                          }`}
                        >
                          <div className={`text-xs ${textClass}`}>
                            {sensitivityMetricView === 'irr'
                              ? `${cell.irr.toFixed(1)}% a.a.`
                              : sensitivityMetricView === 'profit'
                              ? formatCurrency(cell.profit)
                              : `${cell.margin.toFixed(1)}%`}
                          </div>
                          {isBaseCell && (
                            <span className="text-[9px] font-sans text-orange-300 block mt-0.5">
                              (Base)
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
