/**
 * GanttToolbar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Barra de Ferramentas Principal do Gráfico de Gantt:
 *  - Controle de Zoom (Amplo, Semanal/Mensal, Diário)
 *  - Inserção de Tarefas, Fases e Marcos
 *  - Gravação de Linha de Base (Baseline)
 *  - Destaque de Caminho Crítico
 *  - Importação / Exportação (CSV e JSON)
 *  - Carga do Template Padrão de Incorporação
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef } from 'react'
import {
  Plus,
  Layers,
  ZoomIn,
  ZoomOut,
  Calendar,
  Flame,
  Bookmark,
  RefreshCw,
  Download,
  Upload,
  FolderPlus,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react'
import type { GanttZoomLevel } from './GanttHeader'

interface GanttToolbarProps {
  zoom: GanttZoomLevel
  onZoomChange: (zoom: GanttZoomLevel) => void
  onAddTask: () => void
  onAddGroup: () => void
  onSaveBaseline: () => void
  onRecalculate: () => void
  onLoadTemplate: () => void
  showCriticalOnly: boolean
  onToggleCriticalOnly: () => void
  allowSlack: boolean
  onToggleAllowSlack: () => void
  onExportCSV: () => void
  onExportJSON: () => void
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function GanttToolbar({
  zoom,
  onZoomChange,
  onAddTask,
  onAddGroup,
  onSaveBaseline,
  onRecalculate,
  onLoadTemplate,
  showCriticalOnly,
  onToggleCriticalOnly,
  allowSlack,
  onToggleAllowSlack,
  onExportCSV,
  onExportJSON,
  onImportJSON,
}: GanttToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 backdrop-blur-md">
      {/* Ações de Edição e Adição */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={onAddTask}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-white shadow-md active:scale-95 transition-all cursor-pointer"
          style={{ background: 'linear-gradient(135deg, var(--orange, #f97316), #c2410c)' }}
        >
          <Plus size={14} />
          <span>Nova Tarefa</span>
        </button>

        <button
          onClick={onAddGroup}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
        >
          <FolderPlus size={14} className="text-blue-400" />
          <span>Nova Fase / Grupo</span>
        </button>

        <button
          onClick={onLoadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          title="Preencher com template de Estudo, Projeto Legal, Executivo e Aprovações"
        >
          <Sparkles size={14} className="text-purple-400" />
          <span>Template Incorporação</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Linha de Base e CPM */}
        <button
          onClick={onSaveBaseline}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          title="Fixa as datas atuais como Linha de Base (Baseline) para comparação"
        >
          <Bookmark size={13} className="text-yellow-400" />
          <span>Salvar Linha de Base</span>
        </button>

        <button
          onClick={onToggleCriticalOnly}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
            showCriticalOnly
              ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="Filtrar ou destacar apenas o Caminho Crítico (folga zero)"
        >
          <Flame size={13} className="text-red-400" />
          <span>Caminho Crítico</span>
        </button>

        {/* Botão de Permitir Folgas / Modo Puxado */}
        <button
          onClick={onToggleAllowSlack}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
            allowSlack
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
          }`}
          title={
            allowSlack
              ? 'Permitir Folgas: ATIVO (Permite arrastar tarefas para frente mantendo folgas entre as dependências)'
              : 'Permitir Folgas: DESATIVADO (Modo Puxado: Ao mover, todas as tarefas sucessoras para frente são puxadas para a menor data possível)'
          }
        >
          <SlidersHorizontal size={13} className={allowSlack ? 'text-emerald-400' : 'text-blue-400'} />
          <span>{allowSlack ? 'Folgas Permitidas' : 'Sem Folgas (Puxar)'}</span>
        </button>

        <button
          onClick={onRecalculate}
          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          title="Recalcular todas as dependências e datas topológicas"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Controles de Zoom e Importação/Exportação */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Seletor de Escala de Zoom */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => onZoomChange(1)}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              zoom === 1 ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Zoom 1: Visão Geral Ampla"
          >
            Amplo
          </button>
          <button
            onClick={() => onZoomChange(2)}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              zoom === 2 ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Zoom 2: Semanal / Mensal"
          >
            Semanal
          </button>
          <button
            onClick={() => onZoomChange(3)}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              zoom === 3 ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Zoom 3: Diário com Fins de Semana"
          >
            Diário
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Exportar / Importar */}
        <button
          onClick={onExportCSV}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
          title="Exportar tabela EAP para CSV (Excel)"
        >
          <Download size={13} />
          <span>CSV</span>
        </button>

        <button
          onClick={onExportJSON}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
          title="Exportar estrutura completa do cronograma para JSON"
        >
          <Download size={13} />
          <span>JSON</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
          title="Importar cronograma de arquivo JSON"
        >
          <Upload size={13} />
          <span>Importar</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={onImportJSON}
        />
      </div>
    </div>
  )
}
