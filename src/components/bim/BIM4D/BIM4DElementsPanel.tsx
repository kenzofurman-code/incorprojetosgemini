import { useState, useMemo } from 'react'
import {
  Layers,
  Search,
  Filter,
  CheckSquare,
  Square,
  Building2,
  Box,
  Link,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import type { BIMElementGroup } from '../../../types/bim4d'

export interface BIM4DElementsPanelProps {
  elementGroups: BIMElementGroup[]
  selectedElementIds: Set<number>
  onToggleSelectGroup: (group: BIMElementGroup) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onAutoVincular: () => void
}

export default function BIM4DElementsPanel({
  elementGroups,
  selectedElementIds,
  onToggleSelectGroup,
  onSelectAll,
  onClearSelection,
  onAutoVincular,
}: BIM4DElementsPanelProps) {
  const [search, setSearch] = useState('')
  const [selectedStorey, setSelectedStorey] = useState<string>('todos')
  const [selectedCategory, setSelectedCategory] = useState<string>('todas')
  const [filterLinked, setFilterLinked] = useState<'todos' | 'vinculados' | 'sem_vinculo'>('todos')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Opções únicas de pavimentos e categorias para os filtros
  const availableStoreys = useMemo(() => {
    const set = new Set<string>()
    elementGroups.forEach(g => set.add(g.storey))
    return Array.from(set).sort()
  }, [elementGroups])

  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    elementGroups.forEach(g => set.add(g.categoryLabel))
    return Array.from(set).sort()
  }, [elementGroups])

  // Filtragem dos grupos
  const filteredGroups = useMemo(() => {
    return elementGroups.filter(g => {
      // Filtro de Pavimento
      if (selectedStorey !== 'todos' && g.storey !== selectedStorey) return false

      // Filtro de Categoria
      if (selectedCategory !== 'todas' && g.categoryLabel !== selectedCategory) return false

      // Filtro de Vínculo
      if (filterLinked === 'vinculados' && !g.isLinked) return false
      if (filterLinked === 'sem_vinculo' && g.isLinked) return false

      // Busca de texto
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchesGroup =
          g.storey.toLowerCase().includes(query) ||
          g.categoryLabel.toLowerCase().includes(query) ||
          (g.linkedActivityName || '').toLowerCase().includes(query)
        const matchesItems = g.items.some(
          it =>
            it.name.toLowerCase().includes(query) ||
            (it.material || '').toLowerCase().includes(query)
        )
        if (!matchesGroup && !matchesItems) return false
      }

      return true
    })
  }, [elementGroups, selectedStorey, selectedCategory, filterLinked, search])

  // Total de elementos selecionados
  const totalElementsCount = useMemo(() => {
    return elementGroups.reduce((acc, g) => acc + g.count, 0)
  }, [elementGroups])

  const totalFilteredElements = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.count, 0)
  }, [filteredGroups])

  function toggleExpandGroup(groupId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/95 border-r border-slate-800 w-80 flex-shrink-0 text-slate-200 select-none shadow-2xl backdrop-blur-md">
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Layers size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                Elementos do IFC
              </h3>
              <p className="text-[10px] text-slate-400">
                {totalElementsCount} peças identificadas
              </p>
            </div>
          </div>

          <button
            onClick={onAutoVincular}
            title="Auto-Vincular elementos por nome e pavimento"
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            <Sparkles size={12} />
            <span>Auto-Match</span>
          </button>
        </div>

        {/* Barra de Busca */}
        <div className="relative mt-2.5">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar peça, pavimento, material..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700/70 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Filtros Rápidos */}
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <select
            value={selectedStorey}
            onChange={e => setSelectedStorey(e.target.value)}
            className="text-[11px] bg-slate-900 border border-slate-700/70 rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="todos">Todos Pavimentos</option>
            {availableStoreys.map(st => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-[11px] bg-slate-900 border border-slate-700/70 rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="todas">Todas Categorias</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Ações de Seleção em Lote */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[11px]">
          <span className="text-slate-400 font-medium">
            <strong className="text-orange-400 font-bold">{selectedElementIds.size}</strong>{' '}
            selecionado(s)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onSelectAll}
              className="text-[10px] text-slate-300 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Marcar Todos
            </button>
            {selectedElementIds.size > 0 && (
              <button
                onClick={onClearSelection}
                className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Lista de Grupos de Elementos ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-500">
            <Box size={28} className="mb-2 text-slate-600" />
            <p className="text-xs font-semibold text-slate-400">Nenhum elemento encontrado</p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Ajuste os filtros de busca ou verifique se o modelo IFC foi carregado.
            </p>
          </div>
        ) : (
          filteredGroups.map(group => {
            const isGroupSelected = group.expressIds.every(id => selectedElementIds.has(id))
            const isPartiallySelected =
              !isGroupSelected && group.expressIds.some(id => selectedElementIds.has(id))
            const isExpanded = expandedGroups.has(group.id)

            return (
              <div
                key={group.id}
                className={`rounded-xl border transition-all ${
                  isGroupSelected
                    ? 'bg-orange-500/10 border-orange-500/40 shadow-sm'
                    : isPartiallySelected
                    ? 'bg-slate-800/60 border-slate-700'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Header do Grupo */}
                <div
                  onClick={() => onToggleSelectGroup(group)}
                  className="p-2.5 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        onToggleSelectGroup(group)
                      }}
                      className="text-orange-400 hover:text-orange-300 flex-shrink-0"
                    >
                      {isGroupSelected ? (
                        <CheckSquare size={16} className="text-orange-500" />
                      ) : isPartiallySelected ? (
                        <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500 flex items-center justify-center text-[10px] font-bold text-orange-400">
                          -
                        </div>
                      ) : (
                        <Square size={16} className="text-slate-600" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-100 truncate">
                        {group.categoryLabel}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-300 font-medium">{group.storey}</span>
                        <span>•</span>
                        <span className="text-slate-500">{group.count} peça(s)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {group.isLinked ? (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                        title={`Vinculado à atividade: ${group.linkedActivityName}`}
                      >
                        <Link size={9} />
                        <span>Vinculado</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-400">
                        Pendente
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        toggleExpandGroup(group.id)
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                </div>

                {/* Itens detalhados do grupo (se expandido) */}
                {isExpanded && (
                  <div className="px-2.5 pb-2 pt-1 border-t border-slate-800/60 bg-slate-950/70 divide-y divide-slate-900 rounded-b-xl max-h-40 overflow-y-auto">
                    {group.items.map(item => (
                      <div
                        key={item.expressId}
                        className="py-1 flex items-center justify-between text-[10px] text-slate-300"
                      >
                        <span className="truncate pr-2 font-mono" title={item.name}>
                          #{item.expressId} {item.name}
                        </span>
                        {item.material && (
                          <span className="text-[9px] text-slate-500 flex-shrink-0">
                            {item.material}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
