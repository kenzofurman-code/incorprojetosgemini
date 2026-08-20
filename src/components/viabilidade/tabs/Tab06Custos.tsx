import React from 'react'
import { Hammer, HardHat, Megaphone, ShieldAlert, Layers } from 'lucide-react'
import type { ViabilityStudyModel, CostModel } from '../../../types/viabilidade'
import { formatCurrency } from '../../../utils/formatters'

interface Tab06CustosProps {
  study: ViabilityStudyModel
  onUpdateCosts: (costs: CostModel) => void
}

export default function Tab06Custos({
  study,
  onUpdateCosts,
}: Tab06CustosProps) {
  const { costs, product } = study

  const handleChange = (field: keyof CostModel, value: any) => {
    const updated = {
      ...costs,
      [field]: value,
    }

    if (field === 'constructionCostPerBuiltM2' || field === 'constructionBudgetMode') {
      if (updated.constructionBudgetMode === 'global_m2') {
        const built = product.totalBuiltAreaM2 || (product.totalPrivateAreaM2 * 1.5)
        updated.totalConstructionCost = built * (updated.constructionCostPerBuiltM2 || 3250)
      }
    }

    onUpdateCosts(updated)
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Custo de Construção / Obra & Curva de Desembolso ──────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Hammer size={16} className="text-yellow-400" />
          <span>Orçamento da Obra & Curva de Desembolso Físico-Financeiro</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custo por m² Construído (R$/m²)
            </label>
            <input
              type="number"
              value={costs.constructionCostPerBuiltM2 || ''}
              onChange={e => handleChange('constructionCostPerBuiltM2', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-yellow-400 font-mono font-bold text-xs focus:border-yellow-500 focus:outline-none"
              placeholder="Ex: 3250"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custo Total da Construção (R$)
            </label>
            <input
              type="number"
              value={costs.totalConstructionCost || ''}
              onChange={e => handleChange('totalConstructionCost', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-xs focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Curva S de Desembolso
            </label>
            <select
              value={costs.constructionCurveMonths || 24}
              onChange={e => handleChange('constructionCurveMonths', parseInt(e.target.value, 10) || 24)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-sans text-xs focus:border-orange-500 focus:outline-none cursor-pointer"
            >
              <option value="12">Curva S - 12 Meses</option>
              <option value="18">Curva S - 18 Meses</option>
              <option value="24">Curva S - 24 Meses (Padrão Blossom)</option>
              <option value="30">Curva S - 30 Meses</option>
              <option value="36">Curva S - 36 Meses</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Área de Referência
            </label>
            <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs font-semibold">
              {product.totalBuiltAreaM2.toLocaleString('pt-BR')} m² construídos
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Projetos, Levantamentos e Engenharia ───────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <HardHat size={16} className="text-blue-400" />
          <span>Projetos de Arquitetura, Complementares & Sondagens</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Projetos de Arquitetura e Engenharia (R$)
            </label>
            <input
              type="number"
              value={costs.architecturalAndEngineeringProjectsCost || ''}
              onChange={e => handleChange('architecturalAndEngineeringProjectsCost', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sondagens de Solo e Topografia (R$)
            </label>
            <input
              type="number"
              value={costs.surveyAndSoilTestingCost || ''}
              onChange={e => handleChange('surveyAndSoilTestingCost', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── 3. Marketing, Estande e Comissões de Venda ───────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Megaphone size={16} className="text-purple-400" />
          <span>Comercial, Marketing & Comissões Imobiliárias</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Verba de Marketing & Publicidade (% do VGV)
            </label>
            <input
              type="number"
              step="0.1"
              value={costs.marketingBudgetPct || 3.2}
              onChange={e => handleChange('marketingBudgetPct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Comissão de Vendas e Premiações (% do VGV)
            </label>
            <input
              type="number"
              step="0.1"
              value={costs.salesCommissionPct || 4.0}
              onChange={e => handleChange('salesCommissionPct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Estande de Vendas e Apto Decorado (R$)
            </label>
            <input
              type="number"
              value={costs.launchStandAndDecorationCost || ''}
              onChange={e => handleChange('launchStandAndDecorationCost', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── 4. Administração, Gestão e Reservas Técnicas ──────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldAlert size={16} className="text-emerald-400" />
          <span>Administração, Gestão da Incorporadora & Reservas</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Taxa de Administração de Obra (% da Obra)
            </label>
            <input
              type="number"
              step="0.5"
              value={costs.constructionManagementFeePct || 4.5}
              onChange={e => handleChange('constructionManagementFeePct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Taxa de Gestão da Incorporadora (% do VGV)
            </label>
            <input
              type="number"
              step="0.5"
              value={costs.developerIncorporationFeePct || 2.0}
              onChange={e => handleChange('developerIncorporationFeePct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Taxas Municipais & Licenças (R$)
            </label>
            <input
              type="number"
              value={costs.legalPermitsAndUtilityFees || ''}
              onChange={e => handleChange('legalPermitsAndUtilityFees', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reserva Técnica Pós-Obra (% da Obra)
            </label>
            <input
              type="number"
              step="0.5"
              value={costs.postConstructionWarrantyReservePct || 1.5}
              onChange={e => handleChange('postConstructionWarrantyReservePct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
