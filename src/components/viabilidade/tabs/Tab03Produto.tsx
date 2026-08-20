/**
 * components/viabilidade/tabs/Tab03Produto.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Aba 3: Produto Imobiliário & Tipologias:
 *  - Torres, pavimentos e elevadores
 *  - Tabela dinâmica de tipologias de unidades (Studio, 1Q, 2Q, 3Q, Garden, Duplex)
 *  - Áreas privativas, comuns, construídas e cálculo de eficiência
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react'
import { Plus, Trash2, Building, Home, Layers, DollarSign } from 'lucide-react'
import type { ViabilityStudyModel, ProductModel, UnitTypeItem } from '../../../types/viabilidade'
import { formatCurrency } from '../../../utils/formatters'

interface Tab03ProdutoProps {
  study: ViabilityStudyModel
  isAdvancedMode: boolean
  onUpdateProduct: (product: ProductModel) => void
}

export default function Tab03Produto({
  study,
  isAdvancedMode,
  onUpdateProduct,
}: Tab03ProdutoProps) {
  const { product } = study

  // Adicionar Nova Tipologia
  const handleAddUnitType = () => {
    const newId = `ut-${Date.now()}`
    const newUnit: UnitTypeItem = {
      id: newId,
      name: `Nova Tipologia ${product.unitTypes.length + 1}`,
      category: '2_dorms',
      count: 10,
      privateAreaM2: 55.0,
      parkingSpaces: 1,
      basePriceM2: 12000,
      totalPrivateAreaM2: 550,
      unitPrice: 660000,
      totalVgv: 6600000,
    }

    const updatedList = [...product.unitTypes, newUnit]
    recalcAndSave(updatedList, product.commonAreaM2)
  }

  // Excluir Tipologia
  const handleDeleteUnitType = (id: string) => {
    const updatedList = product.unitTypes.filter(u => u.id !== id)
    recalcAndSave(updatedList, product.commonAreaM2)
  }

  // Atualizar campo de tipologia
  const handleUpdateUnitType = (id: string, field: keyof UnitTypeItem, value: any) => {
    const updatedList = product.unitTypes.map(u => {
      if (u.id === id) {
        const updated = { ...u, [field]: value }
        const count = field === 'count' ? parseInt(value, 10) || 0 : updated.count
        const area = field === 'privateAreaM2' ? parseFloat(value) || 0 : updated.privateAreaM2
        const priceM2 = field === 'basePriceM2' ? parseFloat(value) || 0 : updated.basePriceM2

        updated.totalPrivateAreaM2 = count * area
        updated.unitPrice = area * priceM2
        updated.totalVgv = count * area * priceM2
        return updated
      }
      return u
    })

    recalcAndSave(updatedList, product.commonAreaM2)
  }

  // Atualizar Área Comum e recalcular totais
  const handleUpdateCommonArea = (commonArea: number) => {
    recalcAndSave(product.unitTypes, commonArea)
  }

  const recalcAndSave = (unitTypes: UnitTypeItem[], commonAreaM2: number) => {
    let totalPriv = 0
    let totalUnits = 0
    let totalParking = 0

    for (const ut of unitTypes) {
      totalPriv += ut.count * ut.privateAreaM2
      totalUnits += ut.count
      totalParking += ut.count * (ut.parkingSpaces || 1)
    }

    const totalBuilt = totalPriv + commonAreaM2
    const eff = totalBuilt > 0 ? totalPriv / totalBuilt : 0.7

    onUpdateProduct({
      ...product,
      unitTypes,
      commonAreaM2,
      totalPrivateAreaM2: totalPriv,
      totalBuiltAreaM2: totalBuilt,
      efficiencyRatio: eff,
      totalUnitsCount: totalUnits,
      totalParkingSpaces: totalParking,
    })
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Resumo de Torres e Áreas Gerais ──────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Building size={16} className="text-orange-400" />
          <span>Quadro Geral de Áreas & Estrutura de Torres</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Área Privativa Total (m²)
            </label>
            <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-xs">
              {product.totalPrivateAreaM2.toLocaleString('pt-BR')} m²
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Área Comum (m²)
            </label>
            <input
              type="number"
              value={product.commonAreaM2 || ''}
              onChange={e => handleUpdateCommonArea(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Área Construída Total (m²)
            </label>
            <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-xs">
              {product.totalBuiltAreaM2.toLocaleString('pt-BR')} m²
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Eficiência Privativa
            </label>
            <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold text-xs">
              {(product.efficiencyRatio * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Tabela Dinâmica de Tipologias de Unidades ─────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Home size={16} className="text-emerald-400" />
            <span>Tipologias de Unidades, Preço e VGV por Produto</span>
          </h3>

          <button
            onClick={handleAddUnitType}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus size={13} />
            <span>Adicionar Tipologia</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-2.5">Nome / Tipologia</th>
                <th className="p-2.5 text-center">Unidades</th>
                <th className="p-2.5 text-right">Área Priv. (m²)</th>
                <th className="p-2.5 text-center">Vagas</th>
                <th className="p-2.5 text-right">Preço (R$/m²)</th>
                <th className="p-2.5 text-right">Preço Unitário</th>
                <th className="p-2.5 text-right">VGV Total</th>
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40 font-mono">
              {product.unitTypes.map(ut => (
                <tr key={ut.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Nome */}
                  <td className="p-2">
                    <input
                      type="text"
                      value={ut.name}
                      onChange={e => handleUpdateUnitType(ut.id, 'name', e.target.value)}
                      className="w-48 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white font-sans text-xs focus:border-orange-500 focus:outline-none"
                    />
                  </td>

                  {/* Quantidade */}
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      value={ut.count}
                      onChange={e => handleUpdateUnitType(ut.id, 'count', e.target.value)}
                      className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-center font-mono text-xs focus:border-orange-500 focus:outline-none"
                    />
                  </td>

                  {/* Área Privativa */}
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      step="0.5"
                      value={ut.privateAreaM2}
                      onChange={e => handleUpdateUnitType(ut.id, 'privateAreaM2', e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-right font-mono text-xs focus:border-orange-500 focus:outline-none"
                    />
                  </td>

                  {/* Vagas */}
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      value={ut.parkingSpaces}
                      onChange={e => handleUpdateUnitType(ut.id, 'parkingSpaces', e.target.value)}
                      className="w-14 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-center font-mono text-xs focus:border-orange-500 focus:outline-none"
                    />
                  </td>

                  {/* Preço por m² */}
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={ut.basePriceM2}
                      onChange={e => handleUpdateUnitType(ut.id, 'basePriceM2', e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 text-right font-mono text-xs focus:border-orange-500 focus:outline-none"
                    />
                  </td>

                  {/* Preço Unitário (Calculado) */}
                  <td className="p-2 text-right font-semibold text-slate-200">
                    {formatCurrency(ut.unitPrice)}
                  </td>

                  {/* VGV Total da Tipologia (Calculado) */}
                  <td className="p-2 text-right font-bold text-orange-400">
                    {formatCurrency(ut.totalVgv)}
                  </td>

                  {/* Excluir */}
                  <td className="p-2 text-center">
                    <button
                      onClick={() => handleDeleteUnitType(ut.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remover tipologia"
                    >
                      <Trash2 size={13} />
                    </button>
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
