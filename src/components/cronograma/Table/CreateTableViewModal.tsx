import React, { useState } from 'react'
import { X, Plus, Table, Layout, Tag, User } from 'lucide-react'
import type { CustomTableViewTab, TableInstance } from '../../../types/cronograma'

interface CreateTableViewModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (view: CustomTableViewTab) => void
  availableLists: string[]
  availableTags: string[]
}

export default function CreateTableViewModal({
  isOpen,
  onClose,
  onSave,
  availableLists,
  availableTags,
}: CreateTableViewModalProps) {
  const [name, setName] = useState('')
  const [initialTable1, setInitialTable1] = useState('')
  const [initialTable2, setInitialTable2] = useState('')

  if (!isOpen) return null

  const handleCreate = () => {
    if (!name.trim()) return

    const initialTables: TableInstance[] = []

    if (initialTable1.trim()) {
      initialTables.push({
        id: `tbl-${Date.now()}-1`,
        title: initialTable1.trim(),
        listName: availableLists.includes(initialTable1.trim()) ? initialTable1.trim() : undefined,
      })
    } else {
      initialTables.push({
        id: `tbl-${Date.now()}-1`,
        title: `${name.trim()} - Tabela 1`,
      })
    }

    if (initialTable2.trim()) {
      initialTables.push({
        id: `tbl-${Date.now()}-2`,
        title: initialTable2.trim(),
        listName: availableLists.includes(initialTable2.trim()) ? initialTable2.trim() : undefined,
      })
    }

    const newView: CustomTableViewTab = {
      id: `view-tab-${Date.now()}`,
      name: name.trim(),
      tables: initialTables,
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
            <Layout size={16} className="text-orange-400" />
            <span>Criar Nova Visualização de Tabelas</span>
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
              placeholder="Ex: Comparativo de Projetos, Equipe Estrutural..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-orange-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-3">
            <div className="text-slate-400 text-[11px] font-semibold">
              Tabelas Iniciais (Você poderá adicionar mais depois):
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">
                Nome da Tabela 1
              </label>
              <input
                type="text"
                value={initialTable1}
                onChange={e => setInitialTable1(e.target.value)}
                placeholder="Ex: Projeto ALTA"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">
                Nome da Tabela 2 (Opcional - para comparar 2 projetos)
              </label>
              <input
                type="text"
                value={initialTable2}
                onChange={e => setInitialTable2(e.target.value)}
                placeholder="Ex: Projeto NATUNE"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
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
