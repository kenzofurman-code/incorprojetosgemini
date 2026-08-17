/**
 * BIMCategoryFilterModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel de Visibilidade e Filtros por Categorias IFC do modelo 3D.
 * Permite ligar/desligar categorias inteiras (ex: Paredes, Tubulações, Vigas)
 * para isolamento de disciplinas e inspeção de interferências.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { X, Eye, EyeOff, Layers, CheckSquare, Square, Search } from 'lucide-react'
import { useState } from 'react'

export interface BIMCategoryItem {
  category: string
  displayName: string
  count: number
  visible: boolean
}

interface BIMCategoryFilterModalProps {
  categories: BIMCategoryItem[]
  onToggleCategory: (category: string) => void
  onShowAll: () => void
  onHideAll: () => void
  onClose: () => void
}

export default function BIMCategoryFilterModal({
  categories,
  onToggleCategory,
  onShowAll,
  onHideAll,
  onClose,
}: BIMCategoryFilterModalProps) {
  const [search, setSearch] = useState('')

  const filtered = categories.filter(
    c => c.displayName.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase())
  )

  const visibleCount = categories.filter(c => c.visible).length

  return (
    <div
      className="absolute top-3 left-20 w-72 rounded-2xl z-30 flex flex-col shadow-2xl overflow-hidden border border-slate-700/60"
      style={{
        background: 'rgba(15, 25, 35, 0.95)',
        backdropFilter: 'blur(12px)',
        maxHeight: 'calc(100% - 24px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-orange-400" />
          <span className="text-xs font-bold text-white">Categorias IFC</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Search & Global Actions */}
      <div className="p-3 border-b border-slate-800 space-y-2 text-xs">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrar categorias..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1 text-xs rounded-lg outline-none bg-slate-900 border border-slate-800 text-white"
          />
        </div>
        <div className="flex justify-between items-center text-[11px] pt-1">
          <span className="text-slate-400">
            {visibleCount} de {categories.length} ativas
          </span>
          <div className="flex gap-2">
            <button
              onClick={onShowAll}
              className="text-orange-400 hover:text-orange-300 font-semibold"
            >
              Todas
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={onHideAll}
              className="text-slate-400 hover:text-slate-300 font-semibold"
            >
              Nenhuma
            </button>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {filtered.map(cat => (
          <div
            key={cat.category}
            onClick={() => onToggleCategory(cat.category)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              cat.visible
                ? 'bg-slate-900/50 hover:bg-slate-800/80 text-slate-200'
                : 'bg-transparent hover:bg-white/5 text-slate-500 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <button className="p-0.5 text-slate-400">
                {cat.visible ? (
                  <Eye size={14} className="text-emerald-400" />
                ) : (
                  <EyeOff size={14} className="text-slate-600" />
                )}
              </button>
              <div className="truncate">
                <div className="font-medium truncate">{cat.displayName}</div>
                <div className="text-[10px] font-mono text-slate-500">{cat.category}</div>
              </div>
            </div>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
              {cat.count}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-6 text-slate-500 text-xs">
            Nenhuma categoria encontrada.
          </div>
        )}
      </div>
    </div>
  )
}
