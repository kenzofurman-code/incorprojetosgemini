import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Flag,
  Calendar,
  Tag,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FolderGit2,
} from 'lucide-react'
import type { ScheduleTask, TaskPriority, TaskStatus } from '../../../types/cronograma'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TableSectionProps {
  tableId: string
  title: string
  listName?: string
  tags?: string[]
  tasks: ScheduleTask[]
  visibleColumns: string[]
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort: (columnKey: string) => void
  onUpdateTask: (taskId: string, updates: Partial<ScheduleTask>) => void
  onAddTaskToSection: (sectionTag?: string, sectionListName?: string) => void
  onDeleteTask: (taskId: string) => void
  onDeleteTable?: (tableId: string) => void
  onOpenTaskDetails: (task: ScheduleTask) => void
  onOpenColumnSelector: () => void
  allAvailableResponsibles: string[]
  allAvailableTags: string[]
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  urgente: { label: 'Urgente', color: 'text-red-400', bg: 'bg-red-500/15' },
  alta: { label: 'Alta', color: 'text-orange-400', bg: 'bg-orange-500/15' },
  normal: { label: 'Normal', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  baixa: { label: 'Baixa', color: 'text-slate-400', bg: 'bg-slate-500/15' },
}

const TAG_COLORS: Record<string, string> = {
  análise: 'bg-slate-800 text-slate-300 border-slate-700',
  equilíbrio: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  aprovação: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  projetos: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  prefeitura: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  alta: 'bg-slate-800 text-slate-300 border-slate-700',
  natune: 'bg-slate-800 text-slate-300 border-slate-700',
}

export default function TableSection({
  tableId,
  title,
  listName,
  tags = [],
  tasks,
  visibleColumns,
  sortColumn,
  sortDirection,
  onSort,
  onUpdateTask,
  onAddTaskToSection,
  onDeleteTask,
  onDeleteTable,
  onOpenTaskDetails,
  onOpenColumnSelector,
  allAvailableResponsibles,
  allAvailableTags,
}: TableSectionProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [isAddingInline, setIsAddingInline] = useState(false)

  const handleToggleComplete = (task: ScheduleTask) => {
    const isDone = task.status === 'concluido'
    onUpdateTask(task.id, {
      status: isDone ? 'em_andamento' : 'concluido',
      progress: isDone ? 0 : 100,
    })
  }

  const handleQuickAdd = () => {
    if (!newTaskName.trim()) {
      setIsAddingInline(false)
      return
    }

    const primaryTag = tags[0] || 'geral'
    onAddTaskToSection(primaryTag, listName)
    setNewTaskName('')
    setIsAddingInline(false)
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-lg transition-all mb-5">
      {/* ── Section / Table Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Table Title & Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {listName && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                {listName}
              </span>
            )}

            <span className="font-bold text-white text-xs">{title}</span>

            {tags.length > 0 &&
              tags.map(t => (
                <span
                  key={t}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    TAG_COLORS[t.toLowerCase()] || 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {t}
                </span>
              ))}

            <span className="text-[11px] font-mono font-bold text-slate-400 ml-1">
              {tasks.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAddTaskToSection(tags[0], listName)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            title="Adicionar tarefa nesta tabela"
          >
            <Plus size={13} className="text-orange-400" />
            <span>Tarefa</span>
          </button>

          {onDeleteTable && (
            <button
              type="button"
              onClick={() => onDeleteTable(tableId)}
              className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Remover esta tabela da visualização"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Table Rows Body ─────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Header Columns */}
            <thead className="bg-slate-950/90 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="p-2.5 w-10 text-center text-slate-500">#</th>
                <th className="p-2.5 w-8">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-0 cursor-pointer"
                  />
                </th>

                {/* Name */}
                {visibleColumns.includes('name') && (
                  <th
                    onClick={() => onSort('name')}
                    className="p-2.5 min-w-[240px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <span>Name</span>
                      {sortColumn === 'name' && (
                        sortDirection === 'asc' ? <ArrowUp size={11} className="text-orange-400" /> : <ArrowDown size={11} className="text-orange-400" />
                      )}
                    </div>
                  </th>
                )}

                {/* Listas */}
                {visibleColumns.includes('listName') && (
                  <th className="p-2.5 min-w-[90px] text-slate-400">Listas</th>
                )}

                {/* Data inicial */}
                {visibleColumns.includes('startDate') && (
                  <th
                    onClick={() => onSort('startDate')}
                    className="p-2.5 min-w-[100px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <span>Data inicial</span>
                      {sortColumn === 'startDate' && (
                        sortDirection === 'asc' ? <ArrowUp size={11} className="text-orange-400" /> : <ArrowDown size={11} className="text-orange-400" />
                      )}
                    </div>
                  </th>
                )}

                {/* Data de vencimento */}
                {visibleColumns.includes('endDate') && (
                  <th
                    onClick={() => onSort('endDate')}
                    className="p-2.5 min-w-[120px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <span>Data de vencimento</span>
                      {sortColumn === 'endDate' ? (
                        sortDirection === 'asc' ? (
                          <span className="text-orange-400 font-bold flex items-center">⭡1</span>
                        ) : (
                          <span className="text-orange-400 font-bold flex items-center">⭣1</span>
                        )
                      ) : (
                        <ArrowUpDown size={11} className="text-slate-600" />
                      )}
                    </div>
                  </th>
                )}

                {/* Duração */}
                {visibleColumns.includes('durationDays') && (
                  <th className="p-2.5 min-w-[80px] text-slate-400 text-center">Duração</th>
                )}

                {/* Etiquetas */}
                {visibleColumns.includes('tags') && (
                  <th className="p-2.5 min-w-[140px] text-slate-400">Etiquetas</th>
                )}

                {/* Responsável */}
                {visibleColumns.includes('responsible') && (
                  <th className="p-2.5 min-w-[160px] text-slate-400">Responsável</th>
                )}

                {/* Prioridade */}
                {visibleColumns.includes('priority') && (
                  <th className="p-2.5 min-w-[100px] text-slate-400">Prioridade</th>
                )}

                {/* Status */}
                {visibleColumns.includes('status') && (
                  <th className="p-2.5 min-w-[110px] text-slate-400">Status</th>
                )}

                {/* % Progresso */}
                {visibleColumns.includes('progress') && (
                  <th className="p-2.5 min-w-[80px] text-slate-400 text-right">%</th>
                )}

                {/* Add column button */}
                <th className="p-2.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={onOpenColumnSelector}
                    className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-orange-400 transition-colors cursor-pointer"
                    title="Configurar colunas visíveis"
                  >
                    <Plus size={13} />
                  </button>
                </th>
              </tr>
            </thead>

            {/* Rows */}
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30 text-xs">
              {tasks.map((task, idx) => {
                const isCompleted = task.status === 'concluido'
                const priority = task.priority || 'normal'
                const pConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal

                return (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Index */}
                    <td className="p-2 text-center text-slate-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Completion Checkbox */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(task)}
                        className="text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={15} className="text-emerald-400" />
                        ) : (
                          <Circle size={15} className="text-slate-600 hover:text-slate-400" />
                        )}
                      </button>
                    </td>

                    {/* Name */}
                    {visibleColumns.includes('name') && (
                      <td className="p-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={task.name}
                            onChange={e => onUpdateTask(task.id, { name: e.target.value })}
                            className={`w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-orange-500 focus:bg-slate-950 px-1.5 py-0.5 rounded text-xs text-white focus:outline-none ${
                              isCompleted ? 'line-through text-slate-500' : ''
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => onOpenTaskDetails(task)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-orange-400 transition-opacity cursor-pointer"
                            title="Abrir detalhes / Pipefy Card"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </td>
                    )}

                    {/* Listas */}
                    {visibleColumns.includes('listName') && (
                      <td className="p-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {task.listName || listName || 'ALTA'}
                        </span>
                      </td>
                    )}

                    {/* Data Inicial */}
                    {visibleColumns.includes('startDate') && (
                      <td className="p-2 font-mono text-[11px] text-slate-400">
                        <input
                          type="date"
                          value={task.startDate}
                          onChange={e => onUpdateTask(task.id, { startDate: e.target.value })}
                          className="bg-transparent border border-transparent hover:border-slate-700 px-1 py-0.5 rounded text-slate-300 focus:outline-none focus:border-orange-500"
                        />
                      </td>
                    )}

                    {/* Data de Vencimento */}
                    {visibleColumns.includes('endDate') && (
                      <td className="p-2 font-mono text-[11px] text-slate-300">
                        <input
                          type="date"
                          value={task.endDate}
                          onChange={e => onUpdateTask(task.id, { endDate: e.target.value })}
                          className="bg-transparent border border-transparent hover:border-slate-700 px-1 py-0.5 rounded text-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </td>
                    )}

                    {/* Duração */}
                    {visibleColumns.includes('durationDays') && (
                      <td className="p-2 text-center font-mono text-[11px] text-slate-400">
                        {task.durationDays}d
                      </td>
                    )}

                    {/* Etiquetas */}
                    {visibleColumns.includes('tags') && (
                      <td className="p-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(task.tags || tags).map(t => (
                            <span
                              key={t}
                              className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                                TAG_COLORS[t.toLowerCase()] || 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}

                    {/* Responsável */}
                    {visibleColumns.includes('responsible') && (
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {task.responsible ? task.responsible[0].toUpperCase() : 'U'}
                          </div>
                          <select
                            value={task.responsible || ''}
                            onChange={e => onUpdateTask(task.id, { responsible: e.target.value })}
                            className="bg-transparent border border-transparent hover:border-slate-700 text-slate-200 text-xs px-1 py-0.5 rounded focus:outline-none focus:bg-slate-900 cursor-pointer max-w-[130px] truncate"
                          >
                            {allAvailableResponsibles.map(r => (
                              <option key={r} value={r} className="bg-slate-900 text-white">
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    )}

                    {/* Prioridade */}
                    {visibleColumns.includes('priority') && (
                      <td className="p-2">
                        <select
                          value={priority}
                          onChange={e => onUpdateTask(task.id, { priority: e.target.value as TaskPriority })}
                          className={`flex items-center gap-1 bg-transparent border border-transparent hover:border-slate-700 text-xs px-1.5 py-0.5 rounded focus:outline-none focus:bg-slate-900 cursor-pointer font-semibold ${pConfig.color}`}
                        >
                          <option value="urgente" className="bg-slate-900 text-red-400">🚩 Urgente</option>
                          <option value="alta" className="bg-slate-900 text-orange-400">🚩 Alta</option>
                          <option value="normal" className="bg-slate-900 text-blue-400">🚩 Normal</option>
                          <option value="baixa" className="bg-slate-900 text-slate-400">🚩 Baixa</option>
                        </select>
                      </td>
                    )}

                    {/* Status */}
                    {visibleColumns.includes('status') && (
                      <td className="p-2">
                        <select
                          value={task.status}
                          onChange={e => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                          className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] px-1.5 py-0.5 rounded-lg focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          <option value="nao_iniciado">A Fazer</option>
                          <option value="em_andamento">Em Andamento</option>
                          <option value="em_revisao">Revisão</option>
                          <option value="concluido">Concluído</option>
                          <option value="bloqueado">Bloqueado</option>
                        </select>
                      </td>
                    )}

                    {/* % Progresso */}
                    {visibleColumns.includes('progress') && (
                      <td className="p-2 text-right font-mono text-[11px] text-slate-300">
                        {task.progress}%
                      </td>
                    )}

                    {/* Ações */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity cursor-pointer"
                        title="Excluir tarefa"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                )
              })}

              {/* Inline Add Task Row */}
              <tr>
                <td colSpan={visibleColumns.length + 3} className="p-2 bg-slate-950/40">
                  {isAddingInline ? (
                    <div className="flex items-center gap-2 px-2 py-1">
                      <input
                        type="text"
                        value={newTaskName}
                        onChange={e => setNewTaskName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                        placeholder="Nome da nova tarefa... (Pressione Enter)"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-orange-500/50 text-white text-xs focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleQuickAdd}
                        className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer"
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingInline(false)}
                        className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingInline(true)}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-orange-400 text-xs px-2 py-1 rounded transition-colors cursor-pointer font-medium"
                    >
                      <Plus size={13} />
                      <span>Adicionar Tarefa</span>
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
