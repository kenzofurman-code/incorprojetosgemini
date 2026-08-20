import React, { useState } from 'react'
import { X, Plus, Table, FolderGit2, Tag, User, CheckSquare } from 'lucide-react'
import type { TableInstance, TaskStatus } from '../../../types/cronograma'

interface AddTableModalProps {
  isOpen: boolean
  onClose: () => void
  onAddTable: (table: TableInstance) => void
  availableLists: string[]
  availableTags: string[]
  availableResponsibles: string[]
}

export default function AddTableModal({
  isOpen,
  onClose,
  onAddTable,
  availableLists,
  availableTags,
  availableResponsibles,
}: AddTableModalProps) {
  const [title, setTitle] = useState('')
  const [selectedList, setSelectedList] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedResp, setSelectedResp] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | ''>('')

  if (!isOpen) return null

  const handleCreate = () => {
    if (!title.trim()) return

    const newTable: TableInstance = {
      id: `table-inst-${Date.now()}`,
      title: title.trim(),
      listName: selectedList || undefined,
      tagFilter: selectedTag || undefined,
      responsibleFilter: selectedResp || undefined,
      statusFilter: selectedStatus || undefined,
      collapsed: false,
    }

    onAddTable(newTable)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Table size={16} className="text-orange-400" />
            <span>Adicionar Nova Tabela na Visualização</span>
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
          {/* Título da Tabela */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Título da Tabela
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Projeto NATUNE, Projeto ALTA, Análise & Aprovação..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-orange-500 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Filtro por Projeto / Lista */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <FolderGit2 size={13} className="text-blue-400" />
              <span>Filtrar por Projeto / Lista</span>
            </label>
            <select
              value={selectedList}
              onChange={e => setSelectedList(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-orange-500 focus:outline-none cursor-pointer"
            >
              <option value="">Todos os Projetos / Listas</option>
              {availableLists.map(list => (
                <option key={list} value={list}>
                  {list}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Tag */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Tag size={13} className="text-rose-400" />
              <span>Filtrar por Etiqueta / Tag (Opcional)</span>
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

          {/* Filtro por Responsável */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <User size={13} className="text-amber-400" />
              <span>Filtrar por Responsável (Opcional)</span>
            </label>
            <select
              value={selectedResp}
              onChange={e => setSelectedResp(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-orange-500 focus:outline-none cursor-pointer"
            >
              <option value="">Todos os Responsáveis</option>
              {availableResponsibles.map(resp => (
                <option key={resp} value={resp}>
                  {resp}
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
            disabled={!title.trim()}
            className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Adicionar Tabela
          </button>
        </div>
      </div>
    </div>
  )
}
