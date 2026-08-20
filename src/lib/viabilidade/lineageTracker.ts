/**
 * lib/viabilidade/lineageTracker.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rastreabilidade e Linhagem de Cálculo (Lineage):
 *  - Mapeia qualquer indicador (KPI) ou linha do fluxo para sua fórmula semântica
 *  - Lista todas as variáveis ativas, origens das abas e decomposição de coortes
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  ViabilityStudyModel,
  ViabilityMetrics,
  MonthlyCashflowLine,
  LineageTrace,
} from '../../types/viabilidade'
import { formatCurrency } from '../../utils/formatters'

export function getMetricLineageTrace(
  metricKey: keyof ViabilityMetrics | string,
  study: ViabilityStudyModel,
  metrics: ViabilityMetrics,
  cashflow?: MonthlyCashflowLine[]
): LineageTrace {
  switch (metricKey) {
    case 'grossVgv':
      return {
        metricKey: 'grossVgv',
        label: 'VGV Bruto (Valor Geral de Vendas)',
        formattedValue: formatCurrency(metrics.grossVgv),
        semanticFormula: 'VGV_Bruto = ∑ (Unidades_Tipologia × Área_Privativa × Preço_m²)',
        formulaExplanation:
          'Soma do valor de venda de 100% das unidades residenciais e comerciais projetadas no empreendimento, antes de qualquer permuta.',
        factors: study.product.unitTypes.map(ut => ({
          name: `${ut.name} (${ut.count} un × ${ut.privateAreaM2}m²)`,
          value: formatCurrency(ut.count * ut.privateAreaM2 * ut.basePriceM2),
          sourceTab: 'produto',
          fieldKey: `unitType_${ut.id}`,
        })),
      }

    case 'netVgv':
      return {
        metricKey: 'netVgv',
        label: 'VGV Líquido da Incorporadora',
        formattedValue: formatCurrency(metrics.netVgv),
        semanticFormula: 'VGV_Líquido = VGV_Bruto - Permuta_Física_VGV',
        formulaExplanation:
          'Valor potencial de receita da incorporadora após descontar as unidades entregues ao proprietário do terreno em permuta física.',
        factors: [
          {
            name: 'VGV Bruto',
            value: formatCurrency(metrics.grossVgv),
            sourceTab: 'produto',
            fieldKey: 'grossVgv',
          },
          {
            name: `Permuta Física (${study.land.physicalPermutationPct || 0}%)`,
            value: `- ${formatCurrency(metrics.physicalPermutationVgv)}`,
            sourceTab: 'terreno',
            fieldKey: 'physicalPermutationPct',
          },
        ],
      }

    case 'netProfit':
      return {
        metricKey: 'netProfit',
        label: 'Lucro Líquido do Empreendimento',
        formattedValue: formatCurrency(metrics.netProfit),
        semanticFormula: 'Lucro_Líquido = Receitas_Operacionais - Custo_Total_Empreendimento',
        formulaExplanation:
          'Resultado econômico final após deduzir terreno, projetos, obra, marketing, comissões, taxas de administração, tributos e juros financeiros.',
        factors: [
          {
            name: 'Receita Líquida Total',
            value: formatCurrency(metrics.totalOperatingReceipts),
            sourceTab: 'vendas',
            fieldKey: 'totalOperatingReceipts',
          },
          {
            name: 'Custo de Obra',
            value: `- ${formatCurrency(metrics.totalConstructionCost)}`,
            sourceTab: 'custos',
            fieldKey: 'totalConstructionCost',
          },
          {
            name: 'Custo de Terreno',
            value: `- ${formatCurrency(metrics.totalLandCost)}`,
            sourceTab: 'terreno',
            fieldKey: 'totalLandCost',
          },
          {
            name: 'Marketing e Comissões',
            value: `- ${formatCurrency(metrics.totalMarketingCost)}`,
            sourceTab: 'custos',
            fieldKey: 'totalMarketingCost',
          },
          {
            name: 'Administração e Taxas',
            value: `- ${formatCurrency(metrics.totalAdministrationCost)}`,
            sourceTab: 'custos',
            fieldKey: 'totalAdministrationCost',
          },
          {
            name: 'Tributos RET',
            value: `- ${formatCurrency(metrics.totalTaxesCost)}`,
            sourceTab: 'custos',
            fieldKey: 'totalTaxesCost',
          },
          {
            name: 'Juros de Financiamento',
            value: `- ${formatCurrency(metrics.totalFinancingInterestCost)}`,
            sourceTab: 'financiamento',
            fieldKey: 'totalFinancingInterestCost',
          },
        ],
      }

    case 'netMarginPct':
      return {
        metricKey: 'netMarginPct',
        label: 'Margem Líquida sobre VGV',
        formattedValue: `${metrics.netMarginPct.toFixed(1)}%`,
        semanticFormula: 'Margem_Líquida = (Lucro_Líquido / VGV_Líquido) × 100',
        formulaExplanation:
          'Percentual de rentabilidade líquida do empreendimento em relação ao seu VGV comercializável.',
        factors: [
          {
            name: 'Lucro Líquido',
            value: formatCurrency(metrics.netProfit),
            sourceTab: 'resumo',
            fieldKey: 'netProfit',
          },
          {
            name: 'VGV Líquido',
            value: formatCurrency(metrics.netVgv),
            sourceTab: 'produto',
            fieldKey: 'netVgv',
          },
        ],
      }

    case 'maxCashExposure':
      return {
        metricKey: 'maxCashExposure',
        label: 'Exposição Máxima de Caixa (Pico de Capital)',
        formattedValue: formatCurrency(metrics.maxCashExposure),
        semanticFormula: 'Exposição_Máxima = | Min { Saldo_Acumulado_Mês_1..N } |',
        formulaExplanation:
          `O maior volume de capital próprio aportado antes que as receitas de vendas e financiamento superem os desembolsos de obra. Ocorre no Mês ${metrics.maxExposureMonth}.`,
        factors: [
          {
            name: `Pico no Mês ${metrics.maxExposureMonth}`,
            value: formatCurrency(metrics.maxCashExposure),
            sourceTab: 'fluxo',
            fieldKey: 'maxCashExposure',
          },
          {
            name: 'Mês de Payback',
            value: `Mês ${metrics.paybackMonth}`,
            sourceTab: 'fluxo',
            fieldKey: 'paybackMonth',
          },
        ],
      }

    case 'projectAnnualIrrPct':
      return {
        metricKey: 'projectAnnualIrrPct',
        label: 'TIR Anual do Projeto (Taxa Interna de Retorno)',
        formattedValue: `${metrics.projectAnnualIrrPct.toFixed(1)}% a.a.`,
        semanticFormula: 'NPV (TIR, Fluxo_Líquido_Mensal) = 0  →  TIR_Anual = (1 + TIR_Mensal)^12 - 1',
        formulaExplanation:
          'Taxa de desconto que iguala a zero o valor presente líquido do fluxo de caixa do projeto mês a mês.',
        factors: [
          {
            name: 'TIR Mensal',
            value: `${metrics.projectMonthlyIrrPct.toFixed(2)}% a.m.`,
            sourceTab: 'resumo',
            fieldKey: 'projectMonthlyIrrPct',
          },
          {
            name: 'Duração do Projeto',
            value: `${study.milestones.totalProjectMonths || 36} meses`,
            sourceTab: 'cronograma',
            fieldKey: 'totalProjectMonths',
          },
        ],
      }

    case 'npvAtTma':
      return {
        metricKey: 'npvAtTma',
        label: 'VPL (Valor Presente Líquido @ TMA)',
        formattedValue: formatCurrency(metrics.npvAtTma),
        semanticFormula: 'VPL = ∑ [ Fluxo_Mensal_t / (1 + TMA_Mensal)^t ]',
        formulaExplanation:
          `Geração de valor do empreendimento trazida a valor presente descontada à taxa mínima de atratividade de ${study.taxAndIndex.discountRateTmaAnnualPct || 12}% a.a.`,
        factors: [
          {
            name: 'TMA Anual',
            value: `${study.taxAndIndex.discountRateTmaAnnualPct || 12}% a.a.`,
            sourceTab: 'resumo',
            fieldKey: 'discountRateTmaAnnualPct',
          },
        ],
      }

    default:
      return {
        metricKey: String(metricKey),
        label: 'Indicador de Viabilidade',
        formattedValue: String(metrics[metricKey as keyof ViabilityMetrics] || '-'),
        semanticFormula: 'Fórmula parametrizada pelo motor determinístico',
        formulaExplanation: 'Cálculo apurado no motor de viabilidade.',
        factors: [],
      }
  }
}
