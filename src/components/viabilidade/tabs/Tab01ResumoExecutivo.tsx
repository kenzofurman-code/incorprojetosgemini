/**
 * components/viabilidade/tabs/Tab01ResumoExecutivo.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Aba 1: Resumo Executivo & DRE Sintética:
 *  - DRE Consolidada do Empreendimento
 *  - Gráficos de Saldo Acumulado (Curva de Exposição) e Vendas vs Obra
 *  - Índices de Eficiência de Engenharia e Risco
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  TrendingUp,
  Building2,
  DollarSign,
  HelpCircle,
} from 'lucide-react'
import type {
  ViabilityStudyModel,
  ViabilityMetrics,
  MonthlyCashflowLine,
} from '../../../types/viabilidade'
import { formatCurrency } from '../../../utils/formatters'

interface Tab01ResumoExecutivoProps {
  study: ViabilityStudyModel
  metrics: ViabilityMetrics
  cashflow: MonthlyCashflowLine[]
  onInspectMetric: (key: string) => void
}

export default function Tab01ResumoExecutivo({
  study,
  metrics,
  cashflow,
  onInspectMetric,
}: Tab01ResumoExecutivoProps) {
  // Status de Viabilidade da Operação
  const isViable = metrics.netProfit > 0 && metrics.projectAnnualIrrPct >= (study.taxAndIndex.discountRateTmaAnnualPct || 12)
  const isWarning = metrics.netProfit > 0 && !isViable

  // Dados para o Gráfico de Exposição e Saldo Acumulado
  const exposureChartData = cashflow.map(c => ({
    name: `M${c.monthIndex}`,
    saldoAcumulado: Math.round(c.accumulatedCashflow),
    receitaMes: Math.round(c.grossOperatingReceipts),
    desembolsoMes: Math.round(c.totalOperatingDisbursements),
  }))

  // Dados para o Gráfico de Vendas vs Execução de Obra (%)
  const sCurveChartData = cashflow.map(c => ({
    name: `M${c.monthIndex}`,
    vendasAcumuladasPct: c.accumulatedSalesPct,
  }))

  return (
    <div className="space-y-6">
      {/* ── 1. Banner de Status Executivo ──────────────────────────────────── */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 flex-wrap ${
          isViable
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : isWarning
            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}
      >
        <div className="flex items-center gap-3">
          {isViable ? (
            <CheckCircle2 size={24} className="text-emerald-400" />
          ) : isWarning ? (
            <AlertTriangle size={24} className="text-yellow-400" />
          ) : (
            <AlertTriangle size={24} className="text-red-400" />
          )}
          <div>
            <div className="text-sm font-bold">
              {isViable
                ? 'Empreendimento Viável (Supera a TMA e Gera Valor Econômico)'
                : isWarning
                ? 'Viabilidade em Atenção (Lucro Positivo, porém TIR abaixo da TMA de 12%)'
                : 'Empreendimento Inviável no Cenário Atual'}
            </div>
            <p className="text-xs opacity-90">
              VGV Líquido de {formatCurrency(metrics.netVgv)} • Lucro Líquido de {formatCurrency(metrics.netProfit)} ({metrics.netMarginPct.toFixed(1)}% de Margem)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono font-bold">
          <div>TIR: {metrics.projectAnnualIrrPct.toFixed(1)}% a.a.</div>
          <div className="w-px h-4 bg-white/20" />
          <div>VPL: {formatCurrency(metrics.npvAtTma)}</div>
        </div>
      </div>

      {/* ── 2. DRE Sintética & Índices de Projeto ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* DRE Sintética (7 Colunas) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText size={16} className="text-orange-400" />
              <span>DRE Sintética do Empreendimento</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">% s/ VGV Líq.</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* VGV Bruto */}
            <div
              onClick={() => onInspectMetric('grossVgv')}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <span className="text-slate-300 font-medium">(+) VGV Bruto Total</span>
              <span className="font-mono font-bold text-white">{formatCurrency(metrics.grossVgv)}</span>
            </div>

            {/* Permuta Física */}
            <div
              onClick={() => onInspectMetric('netVgv')}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-400"
            >
              <span>(-) Permuta Física ({study.land.physicalPermutationPct}%)</span>
              <span className="font-mono text-red-400">- {formatCurrency(metrics.physicalPermutationVgv)}</span>
            </div>

            {/* VGV Líquido */}
            <div
              onClick={() => onInspectMetric('netVgv')}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 font-bold cursor-pointer"
            >
              <span className="text-orange-400">(=) VGV Líquido da Incorporadora</span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-white">{formatCurrency(metrics.netVgv)}</span>
                <span className="text-slate-400 text-[11px] w-12 text-right">100.0%</span>
              </div>
            </div>

            {/* Terreno */}
            <div
              onClick={() => onInspectMetric('totalLandCost')}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-300"
            >
              <span>(-) Terreno & Despesas de Aquisição</span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-red-400">- {formatCurrency(metrics.totalLandCost)}</span>
                <span className="text-slate-400 text-[11px] w-12 text-right">
                  {metrics.netVgv > 0 ? ((metrics.totalLandCost / metrics.netVgv) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Projetos */}
            <div
              onClick={() => onInspectMetric('totalProjectsCost')}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-300"
            >
              <span>(-) Projetos, Sondagens e Licenciamento</span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-red-400">- {formatCurrency(metrics.totalProjectsCost)}</span>
                <span className="text-slate-400 text-[11px] w-12 text-right">
                  {metrics.netVgv > 0 ? ((metrics.totalProjectsCost / metrics.netVgv) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Obra */}
            <div
              onClick={() => onInspectMetric('totalConstructionCost')}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-300"
            >
              <span>(-) Custo de Construção / Obra</span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-red-400">- {formatCurrency(metrics.totalConstructionCost)}</span>
                <span className="text-slate-400 text-[11px] w-12 text-right">
                  {metrics.netVgv > 0 ? ((metrics.totalConstructionCost / metrics.netVgv) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Marketing */}
            <div
              onClick={() => onInspectMetric('totalMarketingCost')}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-300"
            >
              <span>(-) Marketing & Comissões de Venda</span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-red-400">- {formatCurrency(metrics.totalMarketingCost)}</span>
                <span className="text-slate-400 text-[11px] w-12 text-right">
                  {metrics.netVgv > 0 ? ((metrics.totalMarketingCost / metrics.netVgv) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Administração */}
            <div
              onClick={() => onInspectMetric('totalAdministrationCost')}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-300"
            >
              <span>(-) Administração, Gestão & Reservas</span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-red-400">- {formatCurrency(metrics.totalAdministrationCost)}</span>
                <span className="text-slate-400 text-[11px] w-12 text-right">
                  {metrics.netVgv > 0 ? ((metrics.totalAdministrationCost / metrics.netVgv) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Tributos */}
            <div
              onClick={() => onInspectMetric('totalTaxesCost')}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-300"
            >
              <span>(-) Tributos RET (4.0%)</span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-red-400">- {formatCurrency(metrics.totalTaxesCost)}</span>
                <span className="text-slate-400 text-[11px] w-12 text-right">
                  {metrics.netVgv > 0 ? ((metrics.totalTaxesCost / metrics.netVgv) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Juros Financiamento */}
            <div
              onClick={() => onInspectMetric('totalFinancingInterestCost')}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer text-slate-300"
            >
              <span>(-) Juros de Financiamento à Produção</span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-red-400">- {formatCurrency(metrics.totalFinancingInterestCost)}</span>
                <span className="text-slate-400 text-[11px] w-12 text-right">
                  {metrics.netVgv > 0 ? ((metrics.totalFinancingInterestCost / metrics.netVgv) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Lucro Líquido Final */}
            <div
              onClick={() => onInspectMetric('netProfit')}
              className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 font-bold cursor-pointer"
            >
              <span className="text-emerald-400">(=) LUCRO LÍQUIDO FINAL</span>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-emerald-400 text-sm">{formatCurrency(metrics.netProfit)}</span>
                <span className="text-emerald-300 text-xs w-12 text-right">{metrics.netMarginPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Indicadores de Engenharia & Parâmetros de Eficiência (5 Colunas) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 size={16} className="text-blue-400" />
              <span>Índices Técnicos & Eficiência</span>
            </h3>
            <span className="text-xs text-slate-400">Métricas de Área</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Área Privativa Total</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {study.product.totalPrivateAreaM2.toLocaleString('pt-BR')} m²
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Área Construída Total</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {study.product.totalBuiltAreaM2.toLocaleString('pt-BR')} m²
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Eficiência Privativa</div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                {(study.product.efficiencyRatio * 100).toFixed(1)}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Total de Unidades</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {study.product.totalUnitsCount} un
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Preço Médio Privativo</div>
              <div className="text-sm font-bold text-orange-400 font-mono mt-0.5">
                {formatCurrency(metrics.averageSalePricePerPrivateM2)}/m²
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Custo Obra / Construído</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {formatCurrency(metrics.constructionCostPerBuiltM2)}/m²
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300 space-y-1.5 mt-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Terreno / VGV Líquido:</span>
              <strong className="text-white font-mono">
                {metrics.netVgv > 0 ? ((metrics.totalLandCost / metrics.netVgv) * 100).toFixed(1) : 0}%
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Obra / VGV Líquido:</span>
              <strong className="text-white font-mono">
                {metrics.netVgv > 0 ? ((metrics.totalConstructionCost / metrics.netVgv) * 100).toFixed(1) : 0}%
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Retorno sobre Custo (ROI):</span>
              <strong className="text-emerald-400 font-mono">
                {metrics.profitToCostRatioPct.toFixed(1)}%
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Gráficos de Exposição de Caixa e Saldo Acumulado ──────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-orange-400" />
              <span>Curva de Exposição de Caixa & Saldo Acumulado (R$)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Pico de capital próprio (exposição máxima) e ponto de retorno (payback)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-red-400 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-red-500/80 inline-block" />
              Exposição: {formatCurrency(metrics.maxCashExposure)}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-emerald-500/80 inline-block" />
              Saldo Final: {formatCurrency(metrics.netProfit)}
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={exposureChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={val => `R$ ${(val / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Saldo Acumulado']}
              />
              <Area
                type="monotone"
                dataKey="saldoAcumulado"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorSaldo)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
