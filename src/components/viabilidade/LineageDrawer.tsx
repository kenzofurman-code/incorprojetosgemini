/**
 * components/viabilidade/LineageDrawer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel Lateral Deslizante (Drawer) de Auditoria e Linhagem de Cálculo:
 *  - Exibe o raio-x completo do número selecionado
 *  - Fórmula semântica, explicação conceitual, fatores e origens de abas
 *  - Decomposição de coortes e curvas quando aplicável
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react'
import { X, Calculator, Layers, ArrowRight, ShieldCheck, FileSpreadsheet } from 'lucide-react'
import type { LineageTrace } from '../../types/viabilidade'

interface LineageDrawerProps {
  trace: LineageTrace | null
  onClose: () => void
  onNavigateToTab?: (tabId: string) => void
}

const TAB_NAMES: Record<string, string> = {
  resumo: '1. Resumo Executivo',
  terreno: '2. Terreno & Negociação',
  produto: '3. Produto & Unidades',
  cronograma: '4. Cronograma & Prazos',
  vendas: '5. Vendas & Recebíveis',
  custos: '6. Custos & Obra',
  financiamento: '7. Financiamento',
  fluxo: '8. Fluxo Mensal',
  cenarios: '9. Cenários & Sensibilidade',
  auditoria: '10. Matriz de Auditoria',
}

export default function LineageDrawer({ trace, onClose, onNavigateToTab }: LineageDrawerProps) {
  if (!trace) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col z-50 animate-in slide-in-from-right duration-250"
      >
        {/* Cabeçalho do Drawer */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Raio-X do Cálculo (Lineage)</h2>
              <p className="text-[11px] text-slate-400">Rastreabilidade completa de ponta a ponta</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Drawer */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Card do Indicador / Valor */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 shadow-lg">
            <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
              {trace.label}
            </span>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">
              {trace.formattedValue}
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {trace.formulaExplanation}
            </p>
          </div>

          {/* Equação Semântica */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-2">
              <Layers size={14} className="text-purple-400" />
              <span>Equação do Modelo</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 font-mono text-xs text-emerald-400 break-all leading-relaxed">
              {trace.semanticFormula}
            </div>
          </div>

          {/* Fatores e Parâmetros que compõem este valor */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-400" />
              <span>Variáveis e Fontes Ativas</span>
            </h3>

            <div className="space-y-2">
              {trace.factors.map((factor, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">
                      {factor.name}
                    </div>
                    <button
                      onClick={() => onNavigateToTab?.(factor.sourceTab)}
                      className="text-[10px] text-orange-400/90 hover:text-orange-300 font-semibold flex items-center gap-1 mt-0.5 cursor-pointer"
                    >
                      <span>Aba: {TAB_NAMES[factor.sourceTab] || factor.sourceTab}</span>
                      <ArrowRight size={10} />
                    </button>
                  </div>

                  <div className="text-xs font-bold text-white font-mono whitespace-nowrap">
                    {typeof factor.value === 'number' ? factor.value.toLocaleString('pt-BR') : factor.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decomposição por Coortes (se houver) */}
          {trace.cohortBreakdown && trace.cohortBreakdown.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileSpreadsheet size={14} className="text-yellow-400" />
                <span>Decomposição por Coortes de Venda</span>
              </h3>

              <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="p-2">Mês Venda</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2 text-right">Receita Mês</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {trace.cohortBreakdown.map((cb, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 font-mono text-[11px]">
                        <td className="p-2 text-slate-300">Mês {cb.salesMonth}</td>
                        <td className="p-2 text-slate-400">{cb.receiptType}</td>
                        <td className="p-2 text-right text-emerald-400 font-semibold">
                          R$ {cb.receiptAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Determinístico & Auditável</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
