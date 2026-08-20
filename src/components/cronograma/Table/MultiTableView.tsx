import React, { useState, useMemo } from 'react'
import {
  Tag,
  Columns,
  Filter,
  Search,
  Plus,
  Layers,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type {
  ScheduleTask,
  CronogramaCustomView,
  TableGroupBy,
  TaskPriority,
  TaskStatus,
} from '../../../types/cronograma'
import TableSection from './TableSection'
import ColumnSelectorPopover, { ALL_AVAILABLE_COLUMNS } from './ColumnSelectorPopover'

interface MultiTableViewProps {
  tasks: ScheduleTask[]
  view: CronogramaCustomView
  onUpdateTasks: (updatedTasks: ScheduleTask[]) => void
  onOpenTaskDetails: (task: ScheduleTask) => void
  onAddTask: (initialProps?: Partial<ScheduleTask>) => void
}

export default function MultiTableView({
  tasks,
  view,
  onUpdateTasks,
  onOpenTaskDetails,
  onAddTask,
}: MultiTableViewProps) {
  // ── 1. Estado de Configuração de Colunas ──────────────────────────────────
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    view.visibleColumns || [
      'name',
      'listName',
      'startDate',
      'endDate',
      'tags',
      'responsible',
      'priority',
    ]
  )
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false)

  // ── 2. Estado de Agrupamento ──────────────────────────────────────────────
  const [groupBy, setGroupBy] = useState<TableGroupBy>(view.groupBy || 'tags')

  // ── 3. Estado de Ordenação ────────────────────────────────────────────────
  const [sortColumn, setSortColumn] = useState<string>(view.sortColumn || 'endDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(view.sortDirection || 'asc')

  // ── 4. Filtros Ativos ─────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>(view.tagFilter || '')
  const [selectedResponsibleFilter, setSelectedResponsibleFilter] = useState<string>(
    view.responsibleFilter || ''
  )
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('')
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('')
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false)

  // Lista de Responsáveis e Tags disponíveis
  const allAvailableResponsibles = useMemo(() => {
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

  const allAvailableTags = useMemo(() => {
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

  // Contagem de filtros ativos
  const activeFiltersCount = [
    searchQuery,
    selectedTagFilter,
    selectedResponsibleFilter,
    selectedStatusFilter,
    selectedPriorityFilter,
  ].filter(Boolean).length

  // Alternar ordenação de coluna
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  const handleToggleColumn = (columnId: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnId) ? prev.filter(c => c !== columnId) : [...prev, columnId]
    )
  }

  // Atualizar tarefa individual
  const handleUpdateTask = (taskId: string, updates: Partial<ScheduleTask>) => {
    const updated = tasks.map(t => (t.id === taskId ? { ...t, ...updates } : t))
    onUpdateTasks(updated)
  }

  // Excluir tarefa
  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId)
    onUpdateTasks(updated)
  }

  // Adicionar tarefa em grupo específico
  const handleAddTaskToSection = (sectionTag?: string, sectionStatus?: TaskStatus, sectionResp?: string) => {
    const today = new Date().toISOString().split('T')[0]
    const newTask: ScheduleTask = {
      id: `task-${Date.now()}`,
      wbs: `${tasks.length + 1}`,
      name: 'Nova Atividade',
      startDate: today,
      endDate: today,
      durationDays: 1,
      progress: 0,
      status: sectionStatus || 'nao_iniciado',
      priority: 'normal',
      responsible: sectionResp || selectedResponsibleFilter || allAvailableResponsibles[0] || 'Responsável',
      listName: 'ALTA',
      tags: sectionTag ? [sectionTag] : selectedTagFilter ? [selectedTagFilter] : ['equilíbrio'],
      predecessors: [],
    }

    onUpdateTasks([...tasks, newTask])
  }

  // ── 5. Filtragem e Ordenação das Tarefas ──────────────────────────────────
  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter(t => !t.isGroup) // Apenas tarefas filhas/atividades nas tabelas

    // Filtro por busca
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.responsible?.toLowerCase().includes(q) ||
          t.tags?.some(tag => tag.toLowerCase().includes(q))
      )
    }

    // Filtro por Tag
    if (selectedTagFilter) {
      result = result.filter(t => t.tags?.includes(selectedTagFilter))
    }

    // Filtro por Responsável
    if (selectedResponsibleFilter) {
      result = result.filter(t => t.responsible === selectedResponsibleFilter)
    }

    // Filtro por Status
    if (selectedStatusFilter) {
      result = result.filter(t => t.status === selectedStatusFilter)
    }

    // Filtro por Prioridade
    if (selectedPriorityFilter) {
      result = result.filter(t => (t.priority || 'normal') === selectedPriorityFilter)
    }

    // Ordenação
    if (sortColumn) {
      result.sort((a, b) => {
        let valA: any = a[sortColumn as keyof ScheduleTask] || ''
        let valB: any = b[sortColumn as keyof ScheduleTask] || ''

        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [
    tasks,
    searchQuery,
    selectedTagFilter,
    selectedResponsibleFilter,
    selectedStatusFilter,
    selectedPriorityFilter,
    sortColumn,
    sortDirection,
  ])

  // ── 6. Estruturação dos Grupos de Tabelas ──────────────────────────────────
  const groupedSections = useMemo(() => {
    if (groupBy === 'none') {
      return [
        {
          id: 'sec-all',
          title: 'Todas as Atividades',
          tags: [],
          tasks: filteredAndSortedTasks,
        },
      ]
    }

    if (groupBy === 'status') {
      const statusMap: Record<TaskStatus, string> = {
        nao_iniciado: 'A Fazer',
        em_andamento: 'Em Andamento',
        em_revisao: 'Em Revisão',
        concluido: 'Concluído',
        bloqueado: 'Bloqueado',
      }

      return (Object.keys(statusMap) as TaskStatus[]).map(st => ({
        id: `sec-status-${st}`,
        title: statusMap[st],
        tags: [statusMap[st]],
        tasks: filteredAndSortedTasks.filter(t => t.status === st),
      })).filter(g => g.tasks.length > 0)
    }

    if (groupBy === 'responsible') {
      return allAvailableResponsibles.map(resp => ({
        id: `sec-resp-${resp}`,
        title: resp,
        tags: [resp],
        tasks: filteredAndSortedTasks.filter(t => t.responsible === resp),
      })).filter(g => g.tasks.length > 0)
    }

    if (groupBy === 'listName') {
      const listSet = new Set<string>()
      filteredAndSortedTasks.forEach(t => listSet.add(t.listName || 'ALTA'))
      return Array.from(listSet).map(list => ({
        id: `sec-list-${list}`,
        title: list,
        tags: [list],
        tasks: filteredAndSortedTasks.filter(t => (t.listName || 'ALTA') === list),
      }))
    }

    // Default: Group By Tags (ClickUp style matching screenshot)
    // Agrupa por combinações de tags (ex: [análise, equilíbrio], [aprovação, equilíbrio], [equilíbrio])
    const groups: { id: string; title: string; tags: string[]; tasks: ScheduleTask[] }[] = [
      {
        id: 'sec-tag-analise-eq',
        title: 'análise equilíbrio',
        tags: ['análise', 'equilíbrio'],
        tasks: filteredAndSortedTasks.filter(
          t => t.tags?.includes('análise') && t.tags?.includes('equilíbrio')
        ),
      },
      {
        id: 'sec-tag-aprov-eq',
        title: 'aprovação equilíbrio',
        tags: ['aprovação', 'equilíbrio'],
        tasks: filteredAndSortedTasks.filter(
          t => t.tags?.includes('aprovação') && t.tags?.includes('equilíbrio')
        ),
      },
      {
        id: 'sec-tag-eq-geral',
        title: 'equilíbrio',
        tags: ['equilíbrio'],
        tasks: filteredAndSortedTasks.filter(
          t =>
            t.tags?.includes('equilíbrio') &&
            !t.tags?.includes('análise') &&
            !t.tags?.includes('aprovação')
        ),
      },
      {
        id: 'sec-tag-outras',
        title: 'Outras Atividades',
        tags: ['projetos'],
        tasks: filteredAndSortedTasks.filter(
          t => !t.tags?.includes('equilíbrio') && !t.tags?.includes('análise') && !t.tags?.includes('aprovação')
        ),
      },
    ]

    return groups.filter(g => g.tasks.length > 0)
  }, [groupBy, filteredAndSortedTasks, allAvailableResponsibles])

  return (
    <div className="space-y-4">
      {/* ── Toolbar de Filtros e Personalização ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-900/90 p-3 rounded-2xl border border-slate-800 backdrop-blur-md shadow-lg text-xs">
        {/* Lado Esquerdo: Filtros Rápidos (Etiquetas, Colunas, Agrupar) */}
        <div className="flex items-center gap-2 flex-wrap relative">
          {/* Botão Etiquetas */}
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

            {/* Popover de Tags */}
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
                {allAvailableTags.map(tag => (
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

          {/* Seletor Agrupar por */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
            <Layers size={13} className="text-slate-400" />
            <span className="text-[11px] text-slate-400">Agrupar:</span>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as TableGroupBy)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="tags" className="bg-slate-900 text-white">Etiquetas / Tags</option>
              <option value="status" className="bg-slate-900 text-white">Status</option>
              <option value="responsible" className="bg-slate-900 text-white">Responsável</option>
              <option value="listName" className="bg-slate-900 text-white">Listas / Fase</option>
              <option value="none" className="bg-slate-900 text-white">Sem Agrupamento</option>
            </select>
          </div>

          {/* Badge de Filtros Ativos */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-bold">
              <Filter size={12} />
              <span>{activeFiltersCount} filtros</span>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedTagFilter('')
                  setSelectedResponsibleFilter('')
                  setSelectedStatusFilter('')
                  setSelectedPriorityFilter('')
                }}
                className="hover:text-white ml-1 cursor-pointer"
                title="Limpar todos os filtros"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Lado Direito: Busca e Botão + Tarefa */}
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

      {/* ── Lista de Tabelas Multi-Seção ────────────────────────────────────── */}
      <div className="space-y-4">
        {groupedSections.map(section => (
          <TableSection
            key={section.id}
            sectionId={section.id}
            title={section.title}
            tags={section.tags}
            tasks={section.tasks}
            visibleColumns={visibleColumns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onUpdateTask={handleUpdateTask}
            onAddTaskToSection={(tag) => handleAddTaskToSection(tag)}
            onDeleteTask={handleDeleteTask}
            onOpenTaskDetails={onOpenTaskDetails}
            onOpenColumnSelector={() => setIsColumnSelectorOpen(true)}
            allAvailableResponsibles={allAvailableResponsibles}
            allAvailableTags={allAvailableTags}
          />
        ))}

        {groupedSections.length === 0 && (
          <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
            Nenhuma tarefa encontrada com os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  )
}
