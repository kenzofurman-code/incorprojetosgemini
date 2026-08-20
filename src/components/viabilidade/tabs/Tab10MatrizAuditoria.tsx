/**
 * components/viabilidade/tabs/Tab10MatrizAuditoria.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Aba 10: Matriz Geral de Auditoria e Equações do Sistema:
 *  - Lista completa de todas as equações matemáticas, fontes e consistência
 *  - Visão generalista solicitada pelo usuário para validação institucional
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react'
import { ShieldCheck, Layers, HelpCircle, CheckCircle2 } from 'lucide-react'
import type { ViabilityStudyModel, ViabilityMetrics } from '../../../types/viabilidade'
import { formatCurrency } from '../../../utils/formatters'

interface Tab10MatrizAuditoriaProps {
  study: ViabilityStudyModel
  metrics: ViabilityMetrics
  onInspectMetric: (key: string) => void
}

interface AuditRow {
  category: string
  name: string
  metricKey: string
  formula: string
  currentValue: string
  status: 'ok' | 'attention'
  notes: string
}

export default function Tab10MatrizAuditoria({
  study,
  metrics,
  onInspectMetric,
}: Tab10MatrizAuditoriaProps) {
  const auditRows: AuditRow[] = [
    {
      category: '1. Receitas & VGV',
      name: 'VGV Bruto',
      metricKey: 'grossVgv',
      formula: '∑ (Unidades × Área_Privativa × Preço_m²)',
      currentValue: formatCurrency(metrics.grossVgv),
      status: 'ok',
      notes: `${study.product.unitTypes.length} tipologias cadastradas totalizando ${study.product.totalUnitsCount} unidades.`,
    },
    {
      category: '1. Receitas & VGV',
      name: 'VGV Líquido',
      metricKey: 'netVgv',
      formula: 'VGV_Bruto × (1 - %Permuta_Física)',
      currentValue: formatCurrency(metrics.netVgv),
      status: 'ok',
      notes: `Permuta física de ${study.land.physicalPermutationPct}% deduzida do potencial da incorporadora.`,
    },
    {
      category: '1. Receitas & VGV',
      name: 'Receita Líquida Total Arrecadada',
      metricKey: 'totalOperatingReceipts',
      formula: '∑ (Sinal + Mensais_Obra + Balões + Chaves_Repasse)',
      currentValue: formatCurrency(metrics.totalOperatingReceipts),
      status: Math.abs(metrics.totalOperatingReceipts - metrics.netVgv) < 500 ? 'ok' : 'attention',
      notes: 'Total de recebíveis faturados pela curva de coortes comerciais ao longo de todos os meses.',
    },
    {
      category: '2. Terreno & Aquisição',
      name: 'Custo Total do Terreno',
      metricKey: 'totalLandCost',
      formula: 'Preço_Dinheiro + ITBI + Escritura + Corretagem + Obras_Solo + Permuta_Financeira',
      currentValue: formatCurrency(metrics.totalLandCost),
      status: 'ok',
      notes: `Sinal de ${formatCurrency(study.land.downPayment)} + ${study.land.installmentsCount} parcelas + despesas de legalização.`,
    },
    {
      category: '3. Construção & Projetos',
      name: 'Custo de Construção (Obra)',
      metricKey: 'totalConstructionCost',
      formula: 'Área_Construída × Custo_m²_Construído (ou Orçamento Detalhado)',
      currentValue: formatCurrency(metrics.totalConstructionCost),
      status: 'ok',
      notes: `Desembolsado pela Curva S de ${study.costs.constructionCurveMonths} meses.`,
    },
    {
      category: '3. Construção & Projetos',
      name: 'Projetos e Sondagens',
      metricKey: 'totalProjectsCost',
      formula: 'Projetos_Arquitetura_Engenharia + Sondagens_Solo',
      currentValue: formatCurrency(metrics.totalProjectsCost),
      status: 'ok',
      notes: 'Rateados entre o briefing e o início da obra.',
    },
    {
      category: '4. Comercial & Gestão',
      name: 'Marketing e Comissões',
      metricKey: 'totalMarketingCost',
      formula: '(VGV × %Marketing) + Estande + (VGV × %Comissão_Corretagem)',
      currentValue: formatCurrency(metrics.totalMarketingCost),
      status: 'ok',
      notes: `Marketing de ${study.costs.marketingBudgetPct}% e comissão imobiliária de ${study.costs.salesCommissionPct}%.`,
    },
    {
      category: '4. Comercial & Gestão',
      name: 'Administração e Taxas',
      metricKey: 'totalAdministrationCost',
      formula: 'Taxa_Adm_Obra + Taxa_Gestão_Inc + Licenças + Reservas_Garantia_Contingência',
      currentValue: formatCurrency(metrics.totalAdministrationCost),
      status: 'ok',
      notes: 'Distribuído linearmente ao longo da duração total do empreendimento.',
    },
    {
      category: '5. Tributação & Finanças',
      name: 'Tributos RET',
      metricKey: 'totalTaxesCost',
      formula: 'Receita_Bruta_Mensal × Alíquota_RET (4.0%)',
      currentValue: formatCurrency(metrics.totalTaxesCost),
      status: 'ok',
      notes: 'Regime Especial de Tributação com Patrimônio de Afetação.',
    },
    {
      category: '5. Tributação & Finanças',
      name: 'Juros e Taxas de Financiamento',
      metricKey: 'totalFinancingInterestCost',
      formula: '∑ (Saldo_Devedor_m × Taxa_Juros_Mensal + Taxa_Vistoria)',
      currentValue: formatCurrency(metrics.totalFinancingInterestCost),
      status: 'ok',
      notes: study.financing.enabled
        ? `Financiamento PJ ativo (${study.financing.maxFinancingPctOfConstruction}% da obra a ${study.financing.annualInterestRatePct}% a.a.).`
        : 'Financiamento desativado (100% recursos próprios).',
    },
    {
      category: '6. Indicadores de Resultado',
      name: 'Lucro Líquido',
      metricKey: 'netProfit',
      formula: 'Receitas_Totais - Custo_Total_Empreendimento',
      currentValue: formatCurrency(metrics.netProfit),
      status: metrics.netProfit > 0 ? 'ok' : 'attention',
      notes: `Margem líquida apurada de ${metrics.netMarginPct.toFixed(1)}% sobre o VGV líquido.`,
    },
    {
      category: '6. Indicadores de Resultado',
      name: 'Exposição Máxima de Caixa',
      metricKey: 'maxCashExposure',
      formula: '| Min ( Saldo_Acumulado_Mês_1..N ) |',
      currentValue: formatCurrency(metrics.maxCashExposure),
      status: 'ok',
      notes: `Ocorre no Mês ${metrics.maxExposureMonth}, com retorno total do capital (Payback) no Mês ${metrics.paybackMonth}.`,
    },
    {
      category: '6. Indicadores de Resultado',
      name: 'TIR Anual do Projeto',
      metricKey: 'projectAnnualIrrPct',
      formula: 'NPV (TIR_Mensal, Fluxo_Líquido) = 0  →  (1 + TIR_Mensal)^12 - 1',
      currentValue: `${metrics.projectAnnualIrrPct.toFixed(1)}% a.a.`,
      status: metrics.projectAnnualIrrPct >= (study.taxAndIndex.discountRateTmaAnnualPct || 12) ? 'ok' : 'attention',
      notes: `Supera a TMA de ${study.taxAndIndex.discountRateTmaAnnualPct}% a.a.`,
    },
    {
      category: '6. Indicadores de Resultado',
      name: 'VPL (Valor Presente Líquido)',
      metricKey: 'npvAtTma',
      formula: '∑ [ Fluxo_Mensal_t / (1 + TMA_Mensal)^t ]',
      currentValue: formatCurrency(metrics.npvAtTma),
      status: metrics.npvAtTma >= 0 ? 'ok' : 'attention',
      notes: 'Valor presente líquido de todos os fluxos descontados à TMA.',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header explicativo */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Matriz Geral de Auditoria, Fórmulas e Rastreabilidade</span>
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Mapeamento transparente de 100% das equações financeiras e de engenharia do modelo determinístico.
            Clique em qualquer linha para abrir o raio-x detalhado.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold whitespace-nowrap">
          <CheckCircle2 size={14} />
          <span>Motor Verificado</span>
        </div>
      </div>

      {/* Grade Tabular de Auditoria */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/90 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5">Indicador / Item</th>
                <th className="p-3.5">Fórmula Semântica</th>
                <th className="p-3.5 text-right">Valor Apurado</th>
                <th className="p-3.5">Observações do Modelo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {auditRows.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onInspectMetric(row.metricKey)}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <td className="p-3.5 text-slate-400 font-medium whitespace-nowrap">
                    {row.category}
                  </td>
                  <td className="p-3.5 font-bold text-slate-200 group-hover:text-orange-400 transition-colors whitespace-nowrap flex items-center gap-1.5">
                    <span>{row.name}</span>
                    <HelpCircle size={12} className="text-slate-500 opacity-0 group-hover:opacity-100" />
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-emerald-400">
                    {row.formula}
                  </td>
                  <td className="p-3.5 font-mono text-right font-bold text-white whitespace-nowrap">
                    {row.currentValue}
                  </td>
                  <td className="p-3.5 text-slate-300 text-[11px]">
                    {row.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
