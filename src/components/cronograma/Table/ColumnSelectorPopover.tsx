import React from 'react'
import { X, Check, Columns } from 'lucide-react'

export interface ColumnDefinition {
  id: string
  key: string
  label: string
  alwaysVisible?: boolean
}

export const ALL_AVAILABLE_COLUMNS: ColumnDefinition[] = [
  { id: 'name', key: 'name', label: 'Nome / Atividade', alwaysVisible: true },
  { id: 'listName', key: 'listName', label: 'Listas / Fase' },
  { id: 'startDate', key: 'startDate', label: 'Data Inicial' },
  { id: 'endDate', key: 'endDate', label: 'Data de Vencimento' },
  { id: 'durationDays', key: 'durationDays', label: 'Duração (dias)' },
  { id: 'tags', key: 'tags', label: 'Etiquetas / Tags' },
  { id: 'responsible', key: 'responsible', label: 'Responsável' },
  { id: 'priority', key: 'priority', label: 'Prioridade' },
  { id: 'status', key: 'status', label: 'Status' },
  { id: 'progress', key: 'progress', label: '% Progresso' },
  { id: 'predecessors', key: 'predecessors', label: 'Dependências' },
]

interface ColumnSelectorPopoverProps {
  isOpen: boolean
  onClose: () => void
  visibleColumns: string[]
  onToggleColumn: (columnId: string) => void
}

export default function ColumnSelectorPopover({
  isOpen,
  onClose,
  visibleColumns,
  onToggleColumn,
}: ColumnSelectorPopoverProps) {
  if (!isOpen) return null

  return (
    <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <span className="font-bold text-white flex items-center gap-1.5">
          <Columns size={13} className="text-orange-400" />
          <span>Colunas da Tabela</span>
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
        >
          <X size={13} />
        </button>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin">
        {ALL_AVAILABLE_COLUMNS.map(col => {
          const isChecked = visibleColumns.includes(col.id)
          const isFixed = col.alwaysVisible

          return (
            <label
              key={col.id}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer ${
                isFixed ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <span className="text-slate-300 text-[11px] font-medium">{col.label}</span>
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isFixed}
                onChange={() => !isFixed && onToggleColumn(col.id)}
                className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-orange-500 focus:ring-0 cursor-pointer"
              />
            </label>
          )
        })}
      </div>
    </div>
  )
}
