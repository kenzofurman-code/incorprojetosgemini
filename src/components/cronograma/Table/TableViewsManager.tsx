import React, { useState, useMemo } from 'react'
import {
  Plus,
  X,
  Tag,
  Columns,
  Search,
  Table as TableIcon,
  Filter,
  Users,
  User,
  Layers,
  Sparkles,
} from 'lucide-react'
import type {
  ScheduleTask,
  CustomTableViewTab,
  TableInstance,
  TaskStatus,
} from '../../../types/cronograma'
import TableSection from './TableSection'
import ColumnSelectorPopover from './ColumnSelectorPopover'
import AddTableModal from './AddTableModal'
import CreateTableViewModal from './CreateTableViewModal'

interface TableViewsManagerProps {
  tasks: ScheduleTask[]
  onUpdateTasks: (updatedTasks: ScheduleTask[]) => void
  onOpenTaskDetails: (task: ScheduleTask) => void
  projectId: string
}

const DEFAULT_TABLE_VIEWS: CustomTableViewTab[] = [
  {
    id: 'view-tab-isabele',
    name: '👤 ISABELE',
    tables: [
      {
        id: 'tbl-isabele-analise',
        title: 'análise equilíbrio',
        tagFilter: 'análise',
        listName: 'ALTA',
      },
      {
        id: 'tbl-isabele-aprovacao',
        title: 'aprovação equilíbrio',
        tagFilter: 'aprovação',
        listName: 'NATUNE',
      },
      {
        id: 'tbl-isabele-geral',
        title: 'equilíbrio',
        tagFilter: 'equilíbrio',
        listName: 'PROJETOS',
      },
    ],
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
    sortColumn: 'endDate',
    sortDirection: 'asc',
  },
  {
    id: 'view-tab-equipe',
    name: '👥 EQUIPE INT.',
    tables: [
      {
        id: 'tbl-eq-alta',
        title: 'Projeto ALTA',
        listName: 'ALTA',
      },
      {
        id: 'tbl-eq-natune',
        title: 'Projeto NATUNE',
        listName: 'NATUNE',
      },
      {
        id: 'tbl-eq-projetos',
        title: 'Projetos de Arquitetura & Engenharia',
        listName: 'PROJETOS',
      },
    ],
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
    sortColumn: 'endDate',
    sortDirection: 'asc',
  },
  {
    id: 'view-tab-alana',
    name: '👤 ALANA',
    tables: [
      {
        id: 'tbl-alana-1',
        title: 'Atividades Alana - Projeto ALTA',
        listName: 'ALTA',
        responsibleFilter: 'Alana',
      },
      {
        id: 'tbl-alana-2',
        title: 'Atividades Alana - Projeto NATUNE',
        listName: 'NATUNE',
        responsibleFilter: 'Alana',
      },
    ],
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
    sortColumn: 'endDate',
    sortDirection: 'asc',
  },
  {
    id: 'view-tab-thiago',
    name: '👤 THIAGO',
    tables: [
      {
        id: 'tbl-thiago-1',
        title: 'Coordenação Thiago',
        responsibleFilter: 'Thiago',
      },
    ],
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
  },
  {
    id: 'view-tab-estrutura',
    name: '📊 ESTRUTURA INT.',
    tables: [
      {
        id: 'tbl-est-alta',
        title: 'Estrutural - ALTA',
        listName: 'ALTA',
      },
      {
        id: 'tbl-est-natune',
        title: 'Estrutural - NATUNE',
        listName: 'NATUNE',
      },
    ],
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
  },
  {
    id: 'view-tab-lista',
    name: '📋 Lista Geral',
    tables: [
      {
        id: 'tbl-geral-1',
        title: 'Todas as Atividades',
      },
    ],
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
  },
]

export default function TableViewsManager({
  tasks,
  onUpdateTasks,
  onOpenTaskDetails,
  projectId,
}: TableViewsManagerProps) {
  // ── 1. Estado das Visualizações de Tabelas ─────────────────────────────────
  const [views, setViews] = useState<CustomTableViewTab[]>(() => {
    const saved = localStorage.getItem(`incor_table_views_${projectId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch { /* silence */ }
    }
    return DEFAULT_TABLE_VIEWS
  })

  const [activeViewId, setActiveViewId] = useState<string>('view-tab-isabele')

  // Modais
  const [isCreateViewModalOpen, setIsCreateViewModalOpen] = useState(false)
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false)
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false)

  // Filtros Toolbar
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTagFilter, setSelectedTagFilter] = useState('')
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false)

  // Visualização Ativa
  const activeView = useMemo(() => {
    return views.find(v => v.id === activeViewId) || views[0]
  }, [views, activeViewId])

  // Colunas Visíveis da Visualização Ativa
  const visibleColumns = useMemo(() => {
    return (
      activeView?.visibleColumns || [
        'name',
        'listName',
        'startDate',
        'endDate',
        'tags',
        'responsible',
        'priority',
      ]
    )
  }, [activeView])

  // Listas/Projetos, Tags e Responsáveis disponíveis
  const availableLists = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => {
      if (t.listName) set.add(t.listName)
    })
    if (set.size === 0) {
      set.add('ALTA')
      set.add('NATUNE')
      set.add('PROJETOS')
    }
    return Array.from(set)
  }, [tasks])

  const availableTags = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => {
      t.tags?.forEach(tag => set.add(tag))
    })
    if (set.size === 0) {
      set.add('análise')
      set.add('equilíbrio')
      set.add('aprovação')
      set.add('projetos')
      set.add('prefeitura')
    }
    return Array.from(set)
  }, [tasks])

  const availableResponsibles = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => {
      if (t.responsible) set.add(t.responsible)
    })
    if (set.size === 0) {
      set.add('Isabele Caroline Tows')
      set.add('Thiago')
      set.add('Alana')
      set.add('Bianca')
      set.add('Viviane')
    }
    return Array.from(set)
  }, [tasks])

  // Salvar Views
  const saveViews = (updatedViews: CustomTableViewTab[]) => {
    setViews(updatedViews)
    try {
      localStorage.setItem(`incor_table_views_${projectId}`, JSON.stringify(updatedViews))
    } catch { /* silence */ }
  }

  // Criar Nova Visualização
  const handleAddView = (newView: CustomTableViewTab) => {
    const updated = [...views, newView]
    saveViews(updated)
    setActiveViewId(newView.id)
  }

  // Excluir Visualização (Botão X)
  const handleDeleteView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (views.length <= 1) return // Manter pelo menos 1
    const updated = views.filter(v => v.id !== viewId)
    saveViews(updated)
    if (activeViewId === viewId) {
      setActiveViewId(updated[0]?.id || '')
    }
  }

  // Adicionar Tabela na Visualização Atual
  const handleAddTableToCurrentView = (newTable: TableInstance) => {
    const updated = views.map(v => {
      if (v.id === activeViewId) {
        return {
          ...v,
          tables: [...v.tables, newTable],
        }
      }
      return v
    })
    saveViews(updated)
  }

  // Remover Tabela da Visualização Atual
  const handleDeleteTableFromView = (tableId: string) => {
    const updated = views.map(v => {
      if (v.id === activeViewId) {
        return {
          ...v,
          tables: v.tables.filter(t => t.id !== tableId),
        }
      }
      return v
    })
    saveViews(updated)
  }

  // Alternar Coluna Visível
  const handleToggleColumn = (columnId: string) => {
    const updatedCols = visibleColumns.includes(columnId)
      ? visibleColumns.filter(c => c !== columnId)
      : [...visibleColumns, columnId]

    const updatedViews = views.map(v => {
      if (v.id === activeViewId) {
        return { ...v, visibleColumns: updatedCols }
      }
      return v
    })
    saveViews(updatedViews)
  }

  // Ordenação de Coluna
  const handleSort = (columnKey: string) => {
    const currentSort = activeView?.sortColumn
    const currentDir = activeView?.sortDirection || 'asc'
    const newDir: 'asc' | 'desc' = currentSort === columnKey && currentDir === 'asc' ? 'desc' : 'asc'

    const updatedViews: CustomTableViewTab[] = views.map(v => {
      if (v.id === activeViewId) {
        return { ...v, sortColumn: columnKey, sortDirection: newDir }
      }
      return v
    })
    saveViews(updatedViews)
  }

  // Atualizar Tarefa
  const handleUpdateTask = (taskId: string, updates: Partial<ScheduleTask>) => {
    const updated = tasks.map(t => (t.id === taskId ? { ...t, ...updates } : t))
    onUpdateTasks(updated)
  }

  // Excluir Tarefa
  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId)
    onUpdateTasks(updated)
  }

  // Adicionar Tarefa Direto na Tabela
  const handleAddTaskToSection = (sectionTag?: string, sectionListName?: string) => {
    const today = new Date().toISOString().split('T')[0]
    const newTask: ScheduleTask = {
      id: `task-${Date.now()}`,
      wbs: `${tasks.length + 1}`,
      name: 'Nova Atividade',
      startDate: today,
      endDate: today,
      durationDays: 1,
      progress: 0,
      status: 'nao_iniciado',
      priority: 'normal',
      responsible: 'Isabele Caroline Tows',
      listName: sectionListName || 'ALTA',
      tags: sectionTag ? [sectionTag] : ['equilíbrio'],
      predecessors: [],
    }
    onUpdateTasks([...tasks, newTask])
  }

  // Filtragem Geral das Tarefas
  const getTasksForTable = (table: TableInstance) => {
    let list = tasks.filter(t => !t.isGroup)

    // Filtro da busca
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.responsible?.toLowerCase().includes(q) ||
          t.tags?.some(tag => tag.toLowerCase().includes(q))
      )
    }

    // Filtro da toolbar de tags
    if (selectedTagFilter) {
      list = list.filter(t => t.tags?.includes(selectedTagFilter))
    }

    // Filtro específico da tabela
    if (table.listName && table.listName !== 'TODOS') {
      list = list.filter(t => (t.listName || 'ALTA') === table.listName)
    }

    if (table.tagFilter) {
      list = list.filter(t => t.tags?.includes(table.tagFilter!))
    }

    if (table.responsibleFilter) {
      list = list.filter(t => t.responsible === table.responsibleFilter)
    }

    if (table.statusFilter) {
      list = list.filter(t => t.status === table.statusFilter)
    }

    // Ordenação
    const sortCol = activeView?.sortColumn
    const sortDir = activeView?.sortDirection || 'asc'

    if (sortCol) {
      list.sort((a, b) => {
        let valA: any = a[sortCol as keyof ScheduleTask] || ''
        let valB: any = b[sortCol as keyof ScheduleTask] || ''

        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()

        if (valA < valB) return sortDir === 'asc' ? -1 : 1
        if (valA > valB) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }

    return list
  }

  return (
    <div className="w-full space-y-4">
      {/* ── 1. Sub-Header de Visualizações de Tabelas (ClickUp Style) ────────── */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none shadow-md">
        {views.map(view => {
          const isActive = view.id === activeViewId

          return (
            <div
              key={view.id}
              onClick={() => setActiveViewId(view.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{view.name}</span>

              {/* Botão X para excluir visualização */}
              <button
                type="button"
                onClick={e => handleDeleteView(view.id, e)}
                className="opacity-40 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-opacity ml-1 cursor-pointer"
                title="Excluir esta visualização"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}

        {/* Botão + Visualização */}
        <button
          type="button"
          onClick={() => setIsCreateViewModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 font-bold text-xs transition-colors whitespace-nowrap cursor-pointer border border-dashed border-orange-500/30"
          title="Criar nova visualização de tabelas"
        >
          <Plus size={14} />
          <span>+ Visualização</span>
        </button>
      </div>

      {/* ── 2. Toolbar da Visualização Ativa ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-900/80 p-3 rounded-2xl border border-slate-800 shadow-lg text-xs">
        {/* Lado Esquerdo: Botão Adicionar Tabela, Filtros de Etiquetas, Colunas */}
        <div className="flex items-center gap-2 flex-wrap relative">
          {/* Botão + Adicionar Tabela na Visualização */}
          <button
            onClick={() => setIsAddTableModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            title="Adicionar uma nova tabela nesta visualização (ex: Projeto ALTA, Projeto NATUNE)"
          >
            <Plus size={14} />
            <span>Adicionar Tabela</span>
          </button>

          {/* Filtro de Etiquetas */}
          <div className="relative">
            <button
              onClick={() => setIsTagFilterOpen(!isTagFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold transition-colors cursor-pointer ${
                selectedTagFilter
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <Tag size={13} className={selectedTagFilter ? 'text-rose-400' : 'text-slate-400'} />
              <span>{selectedTagFilter ? `Tag: ${selectedTagFilter}` : 'Etiquetas'}</span>
            </button>

            {isTagFilterOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 p-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 px-2">
                  Filtrar por Tag
                </div>
                <button
                  onClick={() => {
                    setSelectedTagFilter('')
                    setIsTagFilterOpen(false)
                  }}
                  className="w-full text-left px-2 py-1 rounded-lg text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer"
                >
                  Todas as Tags
                </button>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTagFilter(tag)
                      setIsTagFilterOpen(false)
                    }}
                    className="w-full text-left px-2 py-1 rounded-lg text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botão Colunas / Mostrados */}
          <div className="relative">
            <button
              onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <Columns size={13} className="text-orange-400" />
              <span>Mostrados ({visibleColumns.length})</span>
            </button>

            <ColumnSelectorPopover
              isOpen={isColumnSelectorOpen}
              onClose={() => setIsColumnSelectorOpen(false)}
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
            />
          </div>
        </div>

        {/* Lado Direito: Busca e Botão Nova Tarefa */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar tarefas..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:border-orange-500 focus:outline-none w-44 sm:w-56"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => handleAddTaskToSection()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>+ Tarefa</span>
          </button>
        </div>
      </div>

      {/* ── 3. Tabelas da Visualização Ativa ─────────────────────────────────── */}
      <div className="space-y-4">
        {activeView?.tables.map(table => {
          const tableTasks = getTasksForTable(table)

          return (
            <TableSection
              key={table.id}
              tableId={table.id}
              title={table.title}
              listName={table.listName}
              tags={table.tagFilter ? [table.tagFilter] : []}
              tasks={tableTasks}
              visibleColumns={visibleColumns}
              sortColumn={activeView.sortColumn}
              sortDirection={activeView.sortDirection}
              onSort={handleSort}
              onUpdateTask={handleUpdateTask}
              onAddTaskToSection={(tag, listName) => handleAddTaskToSection(tag, listName)}
              onDeleteTask={handleDeleteTask}
              onDeleteTable={handleDeleteTableFromView}
              onOpenTaskDetails={onOpenTaskDetails}
              onOpenColumnSelector={() => setIsColumnSelectorOpen(true)}
              allAvailableResponsibles={availableResponsibles}
              allAvailableTags={availableTags}
            />
          )
        })}

        {(!activeView?.tables || activeView.tables.length === 0) && (
          <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
            Nenhuma tabela adicionada nesta visualização ainda.
            <div className="mt-3">
              <button
                onClick={() => setIsAddTableModalOpen(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md"
              >
                + Adicionar Primeira Tabela
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Modais ───────────────────────────────────────────────────────── */}
      <CreateTableViewModal
        isOpen={isCreateViewModalOpen}
        onClose={() => setIsCreateViewModalOpen(false)}
        onSave={handleAddView}
        availableLists={availableLists}
        availableTags={availableTags}
      />

      <AddTableModal
        isOpen={isAddTableModalOpen}
        onClose={() => setIsAddTableModalOpen(false)}
        onAddTable={handleAddTableToCurrentView}
        availableLists={availableLists}
        availableTags={availableTags}
        availableResponsibles={availableResponsibles}
      />
    </div>
  )
}
