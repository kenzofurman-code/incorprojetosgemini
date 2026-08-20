/**
 * components/viabilidade/tabs/Tab08FluxoMensal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Aba 8: Fluxo de Caixa Mensal Analítico (Ledger Mês a Mês):
 *  - Visualização de todas as entradas, saídas, liberações de dívida e saldo acumulado
 *  - Destaque de mês de lançamento, período de obras e entrega de chaves
 *  - Clique em qualquer linha/célula para inspecionar a linhagem de cálculo
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react'
import { FileSpreadsheet, Download, HelpCircle } from 'lucide-react'
import type { MonthlyCashflowLine, ViabilityMetrics } from '../../../types/viabilidade'
import { formatCurrency } from '../../../utils/formatters'

interface Tab08FluxoMensalProps {
  cashflow: MonthlyCashflowLine[]
  metrics: ViabilityMetrics
  onInspectMetric: (key: string) => void
}

export default function Tab08FluxoMensal({
  cashflow,
  metrics,
  onInspectMetric,
}: Tab08FluxoMensalProps) {
  return (
    <div className="space-y-4">
      {/* Header com Totais */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-orange-400" />
            <span>Grade Analítica do Fluxo de Caixa Mensal ({cashflow.length} Meses)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Clique em qualquer valor para auditar a composição de coortes e curvas
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-slate-300">
            Receitas: <strong className="text-emerald-400">{formatCurrency(metrics.totalOperatingReceipts)}</strong>
          </div>
          <div className="w-px h-4 bg-slate-800" />
          <div className="text-slate-300">
            Custos: <strong className="text-red-400">{formatCurrency(metrics.totalProjectCost)}</strong>
          </div>
          <div className="w-px h-4 bg-slate-800" />
          <div className="text-slate-300">
            Resultado: <strong className="text-white">{formatCurrency(metrics.netProfit)}</strong>
          </div>
        </div>
      </div>

      {/* Grade Horizontal com Scroll */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto max-h-[620px] scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3 border-r border-slate-800 min-w-[70px] sticky left-0 bg-slate-950 z-30">Mês</th>
                <th className="p-3 border-r border-slate-800 min-w-[120px]">Vendas Mês (R$)</th>
                <th className="p-3 border-r border-slate-800 min-w-[110px]">Sinal Clientes</th>
                <th className="p-3 border-r border-slate-800 min-w-[110px]">Mensais Obra</th>
                <th className="p-3 border-r border-slate-800 min-w-[110px]">Balões</th>
                <th className="p-3 border-r border-slate-800 min-w-[120px]">Chaves / Repasse</th>
                <th className="p-3 border-r border-slate-800 min-w-[130px] font-bold text-emerald-400 bg-emerald-950/20">Receita Total</th>
                <th className="p-3 border-r border-slate-800 min-w-[110px]">Terreno</th>
                <th className="p-3 border-r border-slate-800 min-w-[110px]">Projetos</th>
                <th className="p-3 border-r border-slate-800 min-w-[120px]">Obra</th>
                <th className="p-3 border-r border-slate-800 min-w-[110px]">Marketing</th>
                <th className="p-3 border-r border-slate-800 min-w-[110px]">Comissões</th>
                <th className="p-3 border-r border-slate-800 min-w-[110px]">Administração</th>
                <th className="p-3 border-r border-slate-800 min-w-[100px]">Tributos (RET)</th>
                <th className="p-3 border-r border-slate-800 min-w-[130px] font-bold text-red-400 bg-red-950/20">Custo Total</th>
                <th className="p-3 border-r border-slate-800 min-w-[110px]">Financ. Liberação</th>
                <th className="p-3 border-r border-slate-800 min-w-[110px]">Financ. Juros</th>
                <th className="p-3 border-r border-slate-800 min-w-[110px]">Financ. Amort.</th>
                <th className="p-3 border-r border-slate-800 min-w-[120px]">Saldo Devedor</th>
                <th className="p-3 border-r border-slate-800 min-w-[130px] font-bold text-white bg-slate-950">Fluxo Líquido</th>
                <th className="p-3 min-w-[140px] font-bold text-orange-400 bg-slate-950">Saldo Acumulado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px] bg-slate-900/40">
              {cashflow.map(line => {
                const isPositiveMonth = line.netCashflowWithFinancing >= 0
                const isPositiveAccum = line.accumulatedCashflow >= 0

                return (
                  <tr
                    key={line.monthIndex}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      line.isLaunchMonth
                        ? 'bg-orange-500/5'
                        : line.isDeliveryMonth
                        ? 'bg-emerald-500/5'
                        : ''
                    }`}
                  >
                    {/* Mês */}
                    <td className="p-2.5 border-r border-slate-800 font-bold text-white sticky left-0 bg-slate-900 z-10 whitespace-nowrap">
                      {line.dateLabel}
                      {line.isLaunchMonth && (
                        <span className="ml-1 text-[9px] text-orange-400 font-sans block">Lançamento</span>
                      )}
                      {line.isDeliveryMonth && (
                        <span className="ml-1 text-[9px] text-emerald-400 font-sans block">Chaves</span>
                      )}
                    </td>

                    {/* Vendas */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right">
                      {line.salesVgvSoldThisMonth > 0 ? formatCurrency(line.salesVgvSoldThisMonth) : '-'}
                    </td>

                    {/* Sinal */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right">
                      {line.customerDownPaymentReceipts > 0 ? formatCurrency(line.customerDownPaymentReceipts) : '-'}
                    </td>

                    {/* Mensais */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right">
                      {line.customerMonthlyInstallmentReceipts > 0 ? formatCurrency(line.customerMonthlyInstallmentReceipts) : '-'}
                    </td>

                    {/* Balões */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right">
                      {line.customerBalloonReceipts > 0 ? formatCurrency(line.customerBalloonReceipts) : '-'}
                    </td>

                    {/* Chaves / Repasse */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right">
                      {line.customerKeysAndFinancingReceipts > 0 ? formatCurrency(line.customerKeysAndFinancingReceipts) : '-'}
                    </td>

                    {/* Receita Total */}
                    <td className="p-2.5 border-r border-slate-800 text-right font-bold text-emerald-400 bg-emerald-950/15">
                      {formatCurrency(line.grossOperatingReceipts)}
                    </td>

                    {/* Terreno */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right">
                      {line.landDisbursements > 0 ? formatCurrency(line.landDisbursements) : '-'}
                    </td>

                    {/* Projetos */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right">
                      {line.projectsDisbursements > 0 ? formatCurrency(line.projectsDisbursements) : '-'}
                    </td>

                    {/* Obra */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right font-medium">
                      {line.constructionDisbursements > 0 ? formatCurrency(line.constructionDisbursements) : '-'}
                    </td>

                    {/* Marketing */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right">
                      {line.marketingDisbursements > 0 ? formatCurrency(line.marketingDisbursements) : '-'}
                    </td>

                    {/* Comissões */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right">
                      {line.commissionsDisbursements > 0 ? formatCurrency(line.commissionsDisbursements) : '-'}
                    </td>

                    {/* Administração */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right">
                      {line.administrationDisbursements > 0 ? formatCurrency(line.administrationDisbursements) : '-'}
                    </td>

                    {/* Tributos */}
                    <td className="p-2.5 border-r border-slate-800 text-slate-300 text-right">
                      {line.taxesDisbursements > 0 ? formatCurrency(line.taxesDisbursements) : '-'}
                    </td>

                    {/* Custo Total */}
                    <td className="p-2.5 border-r border-slate-800 text-right font-bold text-red-400 bg-red-950/15">
                      {formatCurrency(line.totalOperatingDisbursements)}
                    </td>

                    {/* Financiamento */}
                    <td className="p-2.5 border-r border-slate-800 text-blue-400 text-right">
                      {line.financingDrawdown > 0 ? formatCurrency(line.financingDrawdown) : '-'}
                    </td>
                    <td className="p-2.5 border-r border-slate-800 text-red-400 text-right">
                      {line.financingInterestAndFees > 0 ? formatCurrency(line.financingInterestAndFees) : '-'}
                    </td>
                    <td className="p-2.5 border-r border-slate-800 text-slate-400 text-right">
                      {line.financingAmortization > 0 ? formatCurrency(line.financingAmortization) : '-'}
                    </td>
                    <td className="p-2.5 border-r border-slate-800 text-slate-400 text-right">
                      {line.financingOutstandingBalance > 0 ? formatCurrency(line.financingOutstandingBalance) : '-'}
                    </td>

                    {/* Fluxo Líquido */}
                    <td
                      className={`p-2.5 border-r border-slate-800 text-right font-bold ${
                        isPositiveMonth ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatCurrency(line.netCashflowWithFinancing)}
                    </td>

                    {/* Saldo Acumulado */}
                    <td
                      className={`p-2.5 text-right font-bold ${
                        isPositiveAccum ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatCurrency(line.accumulatedCashflow)}
                    </td>
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
