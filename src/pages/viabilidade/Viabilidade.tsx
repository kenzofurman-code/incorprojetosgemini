/**
 * pages/viabilidade/Viabilidade.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Página Principal do Módulo de Viabilidade de Incorporação (CRD Pro Forma):
 *  - Integração dos 10 domínios temáticos por abas
 *  - Motor determinístico puro com recálculo instantâneo
 *  - Inspetor de Rastreabilidade (Lineage Tooltip + Drawer + Matriz Geral)
 *  - Assistente Flutuante de IA Gemini Copilot com upload e pré-preenchimento
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from 'react'
import {
  FileText,
  MapPin,
  Home,
  Calendar,
  CreditCard,
  Hammer,
  Landmark,
  FileSpreadsheet,
  Sliders,
  ShieldCheck,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type {
  ViabilityStudyModel,
  ViabilityTabId,
  LineageTrace,
  LandDealModel,
  ProductModel,
  MilestoneGraphModel,
  SalesModel,
  CostModel,
  FinancingModel,
} from '../../types/viabilidade'
import { VIABILIDADE_BLOSSOM_FIXTURE } from '../../data/viabilidadeBlossomFixture'
import { createBlankViabilityStudy } from '../../data/viabilidadeBlankTemplate'
import { calculateViabilityStudy } from '../../lib/viabilidade/viabilidadeEngine'
import { getMetricLineageTrace } from '../../lib/viabilidade/lineageTracker'

// Componentes
import ViabilidadeHeader from '../../components/viabilidade/ViabilidadeHeader'
import ViabilidadeKpiCards from '../../components/viabilidade/ViabilidadeKpiCards'
import LineageDrawer from '../../components/viabilidade/LineageDrawer'
import ViabilidadeAiCopilot from '../../components/viabilidade/ViabilidadeAiCopilot'

// Abas
import Tab01ResumoExecutivo from '../../components/viabilidade/tabs/Tab01ResumoExecutivo'
import Tab02Terreno from '../../components/viabilidade/tabs/Tab02Terreno'
import Tab03Produto from '../../components/viabilidade/tabs/Tab03Produto'
import Tab04Cronograma from '../../components/viabilidade/tabs/Tab04Cronograma'
import Tab05Vendas from '../../components/viabilidade/tabs/Tab05Vendas'
import Tab06Custos from '../../components/viabilidade/tabs/Tab06Custos'
import Tab07Financiamento from '../../components/viabilidade/tabs/Tab07Financiamento'
import Tab08FluxoMensal from '../../components/viabilidade/tabs/Tab08FluxoMensal'
import Tab09Cenarios from '../../components/viabilidade/tabs/Tab09Cenarios'
import Tab10MatrizAuditoria from '../../components/viabilidade/tabs/Tab10MatrizAuditoria'

const TABS: { id: ViabilityTabId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'resumo', label: '1. Resumo Executivo', icon: FileText },
  { id: 'terreno', label: '2. Terreno & Permuta', icon: MapPin },
  { id: 'produto', label: '3. Produto & Áreas', icon: Home },
  { id: 'cronograma', label: '4. Cronograma & Marcos', icon: Calendar },
  { id: 'vendas', label: '5. Vendas & Coortes', icon: CreditCard },
  { id: 'custos', label: '6. Custos & Obra', icon: Hammer },
  { id: 'financiamento', label: '7. Financiamento PJ', icon: Landmark },
  { id: 'fluxo', label: '8. Fluxo Mensal', icon: FileSpreadsheet },
  { id: 'cenarios', label: '9. Cenários & Sensibilidade', icon: Sliders },
  { id: 'auditoria', label: '10. Matriz de Auditoria', icon: ShieldCheck },
]

export default function Viabilidade() {
  const { currentProject } = useApp()

  // 1. Estado do Estudo Ativo (inicia com o Blossom real v1.5.1)
  const [study, setStudy] = useState<ViabilityStudyModel>(() => {
    const saved = localStorage.getItem(`incor_viability_${currentProject.id}`)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch { /* fallback */ }
    }
    return {
      ...VIABILIDADE_BLOSSOM_FIXTURE,
      projectId: currentProject.id,
    }
  })

  // 2. Modos de Navegação e Visualização
  const [activeTab, setActiveTab] = useState<ViabilityTabId>('resumo')
  const [activeLineageTrace, setActiveLineageTrace] = useState<LineageTrace | null>(null)

  // 3. Execução do Motor Determinístico
  const calculationResult = useMemo(() => {
    return calculateViabilityStudy(study)
  }, [study])

  const { metrics, cashflow } = calculationResult

  // 4. Handlers de Atualização de Premissas
  const handleUpdateLand = (land: LandDealModel) => {
    setStudy(prev => ({ ...prev, land, updatedAt: new Date().toISOString() }))
  }

  const handleUpdateProduct = (product: ProductModel) => {
    setStudy(prev => ({ ...prev, product, updatedAt: new Date().toISOString() }))
  }

  const handleUpdateMilestones = (milestones: MilestoneGraphModel) => {
    setStudy(prev => ({ ...prev, milestones, updatedAt: new Date().toISOString() }))
  }

  const handleUpdateSales = (sales: SalesModel) => {
    setStudy(prev => ({ ...prev, sales, updatedAt: new Date().toISOString() }))
  }

  const handleUpdateCosts = (costs: CostModel) => {
    setStudy(prev => ({ ...prev, costs, updatedAt: new Date().toISOString() }))
  }

  const handleUpdateFinancing = (financing: FinancingModel) => {
    setStudy(prev => ({ ...prev, financing, updatedAt: new Date().toISOString() }))
  }

  // 5. Carga de Templates
  const handleLoadBlossomFixture = () => {
    setStudy({
      ...VIABILIDADE_BLOSSOM_FIXTURE,
      projectId: currentProject.id,
      id: `study-blossom-${Date.now()}`,
    })
  }

  const handleLoadBlankTemplate = () => {
    setStudy(createBlankViabilityStudy(currentProject.id))
    setActiveTab('terreno')
  }

  // 6. Rastreabilidade e Auditoria
  const handleInspectMetric = (metricKey: string) => {
    const trace = getMetricLineageTrace(metricKey, study, metrics, cashflow)
    setActiveLineageTrace(trace)
  }

  // 7. Aplicação de Premissas Sugeridas pelo Copilot IA
  const handleApplyAiAssumptions = (assumptions: Partial<ViabilityStudyModel>) => {
    setStudy(prev => ({
      ...prev,
      ...assumptions,
      land: assumptions.land ? { ...prev.land, ...assumptions.land } : prev.land,
      product: assumptions.product ? { ...prev.product, ...assumptions.product } : prev.product,
      milestones: assumptions.milestones ? { ...prev.milestones, ...assumptions.milestones } : prev.milestones,
      sales: assumptions.sales ? { ...prev.sales, ...assumptions.sales } : prev.sales,
      costs: assumptions.costs ? { ...prev.costs, ...assumptions.costs } : prev.costs,
      financing: assumptions.financing ? { ...prev.financing, ...assumptions.financing } : prev.financing,
      updatedAt: new Date().toISOString(),
    }))
  }

  // 8. Exportação
  const handleExportCSV = () => {
    let csv = 'Mes;Vendas;Sinal;Mensais;Baloes;Chaves_Repasse;Receita_Total;Terreno;Projetos;Obra;Marketing;Comissoes;Administracao;Tributos_RET;Custo_Total;Financ_Draw;Financ_Juros;Financ_Amort;Saldo_Devedor;Fluxo_Liquido;Saldo_Acumulado\n'
    for (const c of cashflow) {
      csv += `${c.dateLabel};${c.salesVgvSoldThisMonth};${c.customerDownPaymentReceipts};${c.customerMonthlyInstallmentReceipts};${c.customerBalloonReceipts};${c.customerKeysAndFinancingReceipts};${c.grossOperatingReceipts};${c.landDisbursements};${c.projectsDisbursements};${c.constructionDisbursements};${c.marketingDisbursements};${c.commissionsDisbursements};${c.administrationDisbursements};${c.taxesDisbursements};${c.totalOperatingDisbursements};${c.financingDrawdown};${c.financingInterestAndFees};${c.financingAmortization};${c.financingOutstandingBalance};${c.netCashflowWithFinancing};${c.accumulatedCashflow}\n`
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Viabilidade_${study.name.replace(/\s+/g, '_')}_${study.version}.csv`
    a.click()
  }

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(study, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Viabilidade_${study.name.replace(/\s+/g, '_')}_${study.version}.json`
    a.click()
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* ── 1. Barra de Cabeçalho Superior ──────────────────────────────────── */}
      <ViabilidadeHeader
        study={study}
        onLoadBlossomFixture={handleLoadBlossomFixture}
        onLoadBlankTemplate={handleLoadBlankTemplate}
        onExportJSON={handleExportJSON}
        onExportCSV={handleExportCSV}
      />

      {/* ── 2. Cards de KPIs de Topo ────────────────────────────────────────── */}
      <ViabilidadeKpiCards
        metrics={metrics}
        onInspectMetric={handleInspectMetric}
      />

      {/* ── 3. Barra de Navegação por Abas (10 Domínios) ────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── 4. Conteúdo da Aba Ativa ────────────────────────────────────────── */}
      <div className="animate-in fade-in duration-150">
        {activeTab === 'resumo' && (
          <Tab01ResumoExecutivo
            study={study}
            metrics={metrics}
            cashflow={cashflow}
            onInspectMetric={handleInspectMetric}
          />
        )}

        {activeTab === 'terreno' && (
          <Tab02Terreno
            study={study}
            onUpdateLand={handleUpdateLand}
          />
        )}

        {activeTab === 'produto' && (
          <Tab03Produto
            study={study}
            onUpdateProduct={handleUpdateProduct}
          />
        )}

        {activeTab === 'cronograma' && (
          <Tab04Cronograma
            study={study}
            onUpdateMilestones={handleUpdateMilestones}
          />
        )}

        {activeTab === 'vendas' && (
          <Tab05Vendas
            study={study}
            onUpdateSales={handleUpdateSales}
          />
        )}

        {activeTab === 'custos' && (
          <Tab06Custos
            study={study}
            onUpdateCosts={handleUpdateCosts}
          />
        )}

        {activeTab === 'financiamento' && (
          <Tab07Financiamento
            study={study}
            metrics={metrics}
            onUpdateFinancing={handleUpdateFinancing}
          />
        )}

        {activeTab === 'fluxo' && (
          <Tab08FluxoMensal
            cashflow={cashflow}
            metrics={metrics}
            onInspectMetric={handleInspectMetric}
          />
        )}

        {activeTab === 'cenarios' && (
          <Tab09Cenarios
            study={study}
            baseMetrics={metrics}
          />
        )}

        {activeTab === 'auditoria' && (
          <Tab10MatrizAuditoria
            study={study}
            metrics={metrics}
            onInspectMetric={handleInspectMetric}
          />
        )}
      </div>

      {/* ── 5. Inspetor Lateral de Rastreabilidade (Lineage Drawer) ─────────── */}
      <LineageDrawer
        trace={activeLineageTrace}
        onClose={() => setActiveLineageTrace(null)}
        onNavigateToTab={(tabId) => {
          setActiveTab(tabId as ViabilityTabId)
          setActiveLineageTrace(null)
        }}
      />

      {/* ── 6. Assistente Flutuante IA Gemini Copilot ───────────────────────── */}
      <ViabilidadeAiCopilot
        study={study}
        metrics={metrics}
        onApplyAssumptions={handleApplyAiAssumptions}
      />
    </div>
  )
}
