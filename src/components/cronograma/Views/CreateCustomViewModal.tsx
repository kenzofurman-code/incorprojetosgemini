import React, { useState } from 'react'
import { X, Plus, Table, Calendar, Kanban, GitMerge, Building2, Users, Tag, Filter } from 'lucide-react'
import type { CronogramaCustomView, ViewFormat, TableGroupBy } from '../../../types/cronograma'

interface CreateCustomViewModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (view: CronogramaCustomView) => void
  availableResponsibles: string[]
  availableTags: string[]
}

export default function CreateCustomViewModal({
  isOpen,
  onClose,
  onSave,
  availableResponsibles,
  availableTags,
}: CreateCustomViewModalProps) {
  const [name, setName] = useState('')
  const [format, setFormat] = useState<ViewFormat>('tabela')
  const [groupBy, setGroupBy] = useState<TableGroupBy>('tags')
  const [selectedResponsible, setSelectedResponsible] = useState('')
  const [selectedTag, setSelectedTag] = useState('')

  if (!isOpen) return null

  const handleCreate = () => {
    if (!name.trim()) return

    const newView: CronogramaCustomView = {
      id: `view-${Date.now()}`,
      name: name.trim(),
      format,
      groupBy,
      responsibleFilter: selectedResponsible || undefined,
      tagFilter: selectedTag || undefined,
      visibleColumns: [
        'name',
        'listName',
        'startDate',
        'endDate',
        'tags',
        'responsible',
        'priority',
      ],
      sortColumn: 'endDate',
      sortDirection: 'asc',
      filters: {
        responsible: selectedResponsible ? [selectedResponsible] : undefined,
        tags: selectedTag ? [selectedTag] : undefined,
      },
    }

    onSave(newView)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Plus size={16} className="text-orange-400" />
            <span>Criar Nova Visualização</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Nome da Visualização */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Nome da Visualização
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Tarefas da Isabele, Aprovações, Equipe..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-orange-500 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Formato de Visualização */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Tipo de Visualização
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('tabela')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  format === 'tabela'
                    ? 'bg-orange-500/15 text-orange-300 border-orange-500/40 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table size={16} className={format === 'tabela' ? 'text-orange-400' : 'text-slate-500'} />
                <span>Tabela (Multi-Seção)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('gantt')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  format === 'gantt'
                    ? 'bg-orange-500/15 text-orange-300 border-orange-500/40 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar size={16} className={format === 'gantt' ? 'text-orange-400' : 'text-slate-500'} />
                <span>Gráfico de Gantt</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('kanban')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  format === 'kanban'
                    ? 'bg-orange-500/15 text-orange-300 border-orange-500/40 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Kanban size={16} className={format === 'kanban' ? 'text-orange-400' : 'text-slate-500'} />
                <span>Quadro / Kanban</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('network')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  format === 'network'
                    ? 'bg-orange-500/15 text-orange-300 border-orange-500/40 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitMerge size={16} className={format === 'network' ? 'text-orange-400' : 'text-slate-500'} />
                <span>Rede PERT / CPM</span>
              </button>
            </div>
          </div>

          {/* Agrupamento padrão (se tabela) */}
          {format === 'tabela' && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Agrupamento das Tabelas
              </label>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value as TableGroupBy)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-orange-500 focus:outline-none cursor-pointer"
              >
                <option value="tags">Agrupar por Etiquetas / Tags (ex: [análise], [aprovação])</option>
                <option value="status">Agrupar por Status (A Fazer, Em Andamento, Concluído)</option>
                <option value="responsible">Agrupar por Responsável</option>
                <option value="listName">Agrupar por Lista / Fase (ex: ALTA, NATUNE)</option>
                <option value="none">Tabela Única (Sem agrupamento)</option>
              </select>
            </div>
          )}

          {/* Filtro específico por Responsável */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Filtrar por Responsável (Opcional)
            </label>
            <select
              value={selectedResponsible}
              onChange={e => setSelectedResponsible(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-orange-500 focus:outline-none cursor-pointer"
            >
              <option value="">Todos os Responsáveis (Sem filtro)</option>
              {availableResponsibles.map(resp => (
                <option key={resp} value={resp}>
                  {resp}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro específico por Tag */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Filtrar por Etiqueta / Tag (Opcional)
            </label>
            <select
              value={selectedTag}
              onChange={e => setSelectedTag(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-orange-500 focus:outline-none cursor-pointer"
            >
              <option value="">Todas as Etiquetas</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Criar Visualização
          </button>
        </div>
      </div>
    </div>
  )
}
