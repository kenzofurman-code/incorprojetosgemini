/**
 * components/viabilidade/tabs/Tab05Vendas.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Aba 5: Vendas & Recebíveis:
 *  - Velocidade de Vendas (VSO % a.m.) e Vendas no Lançamento
 *  - Plano de Pagamento Padrão dos Clientes (Sinal, Mensais, Balões e Repasse)
 *  - Validação de soma 100% da condição comercial
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react'
import { TrendingUp, CreditCard, Percent, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ViabilityStudyModel, SalesModel, PaymentPlanModel } from '../../../types/viabilidade'

interface Tab05VendasProps {
  study: ViabilityStudyModel
  isAdvancedMode: boolean
  onUpdateSales: (sales: SalesModel) => void
}

export default function Tab05Vendas({
  study,
  isAdvancedMode,
  onUpdateSales,
}: Tab05VendasProps) {
  const { sales } = study
  const plan = sales.paymentPlan

  const handlePlanChange = (field: keyof PaymentPlanModel, value: number) => {
    onUpdateSales({
      ...sales,
      paymentPlan: {
        ...plan,
        [field]: value,
      },
    })
  }

  const handleSalesChange = (field: keyof SalesModel, value: number) => {
    onUpdateSales({
      ...sales,
      [field]: value,
    })
  }

  const totalPlanPct =
    (plan.downPaymentPct || 0) +
    (plan.constructionInstallmentsPct || 0) +
    (plan.balloonInstallmentsPct || 0) +
    (plan.keysDeliveryPct || 0) +
    (plan.bankFinancingRepassePct || 0) +
    (plan.postKeysInstallmentsPct || 0)

  const isPlanValid = Math.abs(totalPlanPct - 100) < 0.1

  return (
    <div className="space-y-6">
      {/* ── 1. Velocidade de Vendas & Absorção (VSO) ─────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <TrendingUp size={16} className="text-orange-400" />
          <span>Curva de Vendas & Velocidade de Absorção (VSO)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Vendas no Lançamento (Mês 1) (%)
            </label>
            <input
              type="number"
              step="1"
              value={sales.launchSalesPct || 35}
              onChange={e => handleSalesChange('launchSalesPct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-orange-400 font-mono font-bold text-xs focus:border-orange-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">% do estoque vendido no primeiro mês</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Velocidade Mensal de Vendas (VSO % a.m.)
            </label>
            <input
              type="number"
              step="0.5"
              value={sales.monthlyAbsorptionVsoPct || 5.5}
              onChange={e => handleSalesChange('monthlyAbsorptionVsoPct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-xs focus:border-orange-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Ritmo médio de absorção durante as obras</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Valorização da Tabela até as Chaves (%)
            </label>
            <input
              type="number"
              step="1"
              value={sales.constructionValueAppreciationPct || 15}
              onChange={e => handleSalesChange('constructionValueAppreciationPct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold text-xs focus:border-orange-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Ganho acumulado de preço no período</span>
          </div>
        </div>
      </div>

      {/* ── 2. Condição Comercial & Plano de Pagamento dos Clientes ──────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard size={16} className="text-emerald-400" />
            <span>Condição Comercial Padrão (Plano de Pagamento dos Clientes)</span>
          </h3>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold font-mono border ${
              isPlanValid
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/15 text-red-400 border-red-500/30'
            }`}
          >
            {isPlanValid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span>Soma: {totalPlanPct.toFixed(1)}% {isPlanValid ? '(Correto 100%)' : '(Diferente de 100%)'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Sinal / Entrada (%)
            </label>
            <input
              type="number"
              step="1"
              value={plan.downPaymentPct || 10}
              onChange={e => handlePlanChange('downPaymentPct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs focus:border-orange-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">No mês da assinatura</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Mensais de Obra (%)
            </label>
            <input
              type="number"
              step="1"
              value={plan.constructionInstallmentsPct || 15}
              onChange={e => handlePlanChange('constructionInstallmentsPct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs focus:border-orange-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Diluídas até as chaves</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Balões Semestrais (%)
            </label>
            <input
              type="number"
              step="1"
              value={plan.balloonInstallmentsPct || 10}
              onChange={e => handlePlanChange('balloonInstallmentsPct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs focus:border-orange-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">A cada 6 meses na obra</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Parcela das Chaves (%)
            </label>
            <input
              type="number"
              step="1"
              value={plan.keysDeliveryPct || 5}
              onChange={e => handlePlanChange('keysDeliveryPct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs focus:border-orange-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">No Habite-se / CVCO</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-emerald-400 mb-1">
              Financiamento / Repasse (%)
            </label>
            <input
              type="number"
              step="1"
              value={plan.bankFinancingRepassePct || 60}
              onChange={e => handlePlanChange('bankFinancingRepassePct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-xs focus:border-emerald-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Financiado pelo banco</span>
          </div>
        </div>
      </div>
    </div>
  )
}
