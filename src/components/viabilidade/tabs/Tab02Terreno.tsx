/**
 * components/viabilidade/tabs/Tab02Terreno.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Aba 2: Terreno & Negociação:
 *  - Área, zoneamento e potencial construtivo
 *  - Condições de compra em dinheiro (sinal e parcelamento)
 *  - Permuta física (% unidades) e permuta financeira (% VGV)
 *  - Custos de legalização, ITBI, cartório, corretagem e demolição
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react'
import { MapPin, DollarSign, Percent, FileCheck, Layers } from 'lucide-react'
import type { ViabilityStudyModel, LandDealModel } from '../../../types/viabilidade'
import { formatCurrency } from '../../../utils/formatters'

interface Tab02TerrenoProps {
  study: ViabilityStudyModel
  onUpdateLand: (land: LandDealModel) => void
}

export default function Tab02Terreno({
  study,
  onUpdateLand,
}: Tab02TerrenoProps) {
  const { land } = study

  const handleChange = (field: keyof LandDealModel, value: number) => {
    onUpdateLand({
      ...land,
      [field]: value,
    })
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Dimensões do Terreno & Potencial ──────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <MapPin size={16} className="text-orange-400" />
          <span>Dimensões do Terreno & Zoneamento Urbanístico</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Área do Terreno (m²)
            </label>
            <input
              type="number"
              value={land.landAreaM2 || ''}
              onChange={e => handleChange('landAreaM2', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
              placeholder="Ex: 1450"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Coeficiente Básico (sem outorga)
            </label>
            <input
              type="number"
              step="0.1"
              value={land.basicFar || ''}
              onChange={e => handleChange('basicFar', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
              placeholder="Ex: 2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Coeficiente Máximo Permitido
            </label>
            <input
              type="number"
              step="0.1"
              value={land.zoningMaxFar || ''}
              onChange={e => handleChange('zoningMaxFar', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
              placeholder="Ex: 4.0"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custo Outorga Onerosa / Potencial Adicional (R$)
            </label>
            <input
              type="number"
              value={land.additionalFarCost || ''}
              onChange={e => handleChange('additionalFarCost', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
              placeholder="Ex: 350000"
            />
          </div>
        </div>
      </div>

      {/* ── 2. Negociação de Compra & Pagamento ───────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <DollarSign size={16} className="text-emerald-400" />
          <span>Condições de Compra em Dinheiro & Parcelamento</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Preço de Compra em Dinheiro (R$)
            </label>
            <input
              type="number"
              value={land.cashPurchasePrice || ''}
              onChange={e => handleChange('cashPurchasePrice', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold text-xs focus:border-orange-500 focus:outline-none"
              placeholder="Ex: 4800000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sinal de Entrada (Mês 1) (R$)
            </label>
            <input
              type="number"
              value={land.downPayment || ''}
              onChange={e => handleChange('downPayment', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
              placeholder="Ex: 800000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Quantidade de Parcelas Mensais
            </label>
            <input
              type="number"
              value={land.installmentsCount || ''}
              onChange={e => handleChange('installmentsCount', parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
              placeholder="Ex: 10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Valor da Parcela Mensal (R$)
            </label>
            <input
              type="number"
              value={land.installmentsMonthlyAmount || ''}
              onChange={e => handleChange('installmentsMonthlyAmount', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
              placeholder="Ex: 400000"
            />
          </div>
        </div>
      </div>

      {/* ── 3. Permutas (Física e Financeira) ─────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Percent size={16} className="text-purple-400" />
          <span>Estruturação de Permutas</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-purple-300 mb-1">
              Permuta Física (% em Unidades Entregues)
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Percentual das unidades que serão entregues ao dono do terreno (reduz o VGV comercializável da incorporadora).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                value={land.physicalPermutationPct || 0}
                onChange={e => handleChange('physicalPermutationPct', parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-purple-300 font-mono font-bold text-xs focus:border-purple-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400 font-bold">%</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-blue-300 mb-1">
              Permuta Financeira (% sobre VGV Líquido)
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Percentual repassado em dinheiro ao proprietário do terreno conforme o recebimento das vendas dos clientes.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                value={land.financialPermutationPct || 0}
                onChange={e => handleChange('financialPermutationPct', parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-blue-300 font-mono font-bold text-xs focus:border-blue-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400 font-bold">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Legalização, ITBI, Cartório & Obras de Solo ─────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <FileCheck size={16} className="text-blue-400" />
          <span>Custos Acessórios de Aquisição, Cartório & Solo</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ITBI (% sobre Compra em Dinheiro)
            </label>
            <input
              type="number"
              step="0.1"
              value={land.transferTaxPct || 2.5}
              onChange={e => handleChange('transferTaxPct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Comissão de Intermediação / Angariação (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={land.brokerageFeePct || 4.0}
              onChange={e => handleChange('brokerageFeePct', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Escritura, Certidões & Registro (R$)
            </label>
            <input
              type="number"
              value={land.registryAndNotaryCost || ''}
              onChange={e => handleChange('registryAndNotaryCost', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Demolição, Sondagem & Terraplenagem (R$)
            </label>
            <input
              type="number"
              value={land.demolitionAndEarthworkCost || ''}
              onChange={e => handleChange('demolitionAndEarthworkCost', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Compensação Ambiental & EIV (R$)
            </label>
            <input
              type="number"
              value={land.environmentalCompensationCost || ''}
              onChange={e => handleChange('environmentalCompensationCost', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
