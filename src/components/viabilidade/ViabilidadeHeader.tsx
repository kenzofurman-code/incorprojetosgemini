/**
 * components/viabilidade/ViabilidadeHeader.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Barra de Cabeçalho e Ações do Módulo de Viabilidade:
 *  - Seletor de versão / estudo
 *  - Ações de Carregar Exemplo (Blossom v1.5.1) e Novo Estudo em Branco
 *  - Toggle entre Modo Essencial (Executivo) e Modo Avançado (Engenharia)
 *  - Exportação para JSON e Excel (DRE + Fluxo Mensal)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react'
import {
  Sparkles,
  Plus,
  SlidersHorizontal,
  FileSpreadsheet,
  Download,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react'
import type { ViabilityStudyModel } from '../../types/viabilidade'

interface ViabilidadeHeaderProps {
  study: ViabilityStudyModel
  isAdvancedMode: boolean
  onToggleAdvancedMode: () => void
  onLoadBlossomFixture: () => void
  onLoadBlankTemplate: () => void
  onExportJSON: () => void
  onExportCSV: () => void
}

export default function ViabilidadeHeader({
  study,
  isAdvancedMode,
  onToggleAdvancedMode,
  onLoadBlossomFixture,
  onLoadBlankTemplate,
  onExportJSON,
  onExportCSV,
}: ViabilidadeHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
      {/* Informações do Estudo e Versão */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
          <FileSpreadsheet size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight">
              {study.name}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
              {study.version}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Análise de Viabilidade Econômico-Financeira • Modelo CRD Pro Forma
          </p>
        </div>
      </div>

      {/* Ações e Controles */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Carregar Exemplo Blossom */}
        <button
          onClick={onLoadBlossomFixture}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          title="Carregar premissas completas do modelo real de referência (Blossom v1.5.1)"
        >
          <Sparkles size={13} className="text-purple-400" />
          <span>Carregar Exemplo (Blossom)</span>
        </button>

        {/* Novo Estudo em Branco */}
        <button
          onClick={onLoadBlankTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          title="Iniciar novo estudo com campos zerados e premissas recomendadas para preenchimento manual"
        >
          <Plus size={13} className="text-emerald-400" />
          <span>Novo em Branco</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Toggle Modo Essencial / Avançado */}
        <button
          onClick={onToggleAdvancedMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            isAdvancedMode
              ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="Alternar entre visualização Essencial (foco em tomada de decisão) e Avançada (coeficientes profundos de engenharia)"
        >
          <SlidersHorizontal size={13} className={isAdvancedMode ? 'text-orange-400' : 'text-slate-400'} />
          <span>{isAdvancedMode ? 'Modo Avançado (Ativo)' : 'Modo Essencial'}</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Exportação */}
        <button
          onClick={onExportCSV}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          title="Exportar Fluxo Mensal e DRE para CSV"
        >
          <Download size={14} />
        </button>
      </div>
    </div>
  )
}
