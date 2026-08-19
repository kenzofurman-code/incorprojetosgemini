/**
 * KanbanBoard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Quadro Kanban Sincronizado com a base de dados da EAP/Gantt.
 * Permite movimentar tarefas entre as colunas de status (A Fazer, Em Andamento,
 * Em Revisão, Concluído, Bloqueado) com atualização instantânea no Gantt.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react'
import {
  Clock,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Flame,
  User,
  Calendar,
  FileCheck,
  Plus,
} from 'lucide-react'
import type { ScheduleTask, TaskStatus } from '../../../types/cronograma'
import { formatDateBR } from '../../../lib/businessCalendar'

interface KanbanBoardProps {
  tasks: ScheduleTask[]
  onTasksChange: (tasks: ScheduleTask[]) => void
  onOpenDeliverablesModal?: (task: ScheduleTask) => void
}

interface ColumnConfig {
  status: TaskStatus
  title: string
  color: string
  borderColor: string
  bgColor: string
  icon: any
}

const COLUMNS: ColumnConfig[] = [
  {
    status: 'nao_iniciado',
    title: 'A Fazer',
    color: '#94A3B8',
    borderColor: 'rgba(148, 163, 184, 0.3)',
    bgColor: 'rgba(148, 163, 184, 0.05)',
    icon: Clock,
  },
  {
    status: 'em_andamento',
    title: 'Em Andamento',
    color: '#3B82F6',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    bgColor: 'rgba(59, 130, 246, 0.05)',
    icon: PlayCircle,
  },
  {
    status: 'em_revisao',
    title: 'Em Revisão',
    color: '#EAB308',
    borderColor: 'rgba(234, 179, 8, 0.3)',
    bgColor: 'rgba(234, 179, 8, 0.05)',
    icon: AlertTriangle,
  },
  {
    status: 'concluido',
    title: 'Concluído',
    color: '#22C55E',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    bgColor: 'rgba(34, 197, 94, 0.05)',
    icon: CheckCircle2,
  },
  {
    status: 'bloqueado',
    title: 'Bloqueado',
    color: '#EF4444',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    bgColor: 'rgba(239, 68, 68, 0.05)',
    icon: AlertOctagon,
  },
]

export default function KanbanBoard({
  tasks,
  onTasksChange,
  onOpenDeliverablesModal,
}: KanbanBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [filterResponsible, setFilterResponsible] = useState<string>('todos')

  // Filtra tarefas (somente tarefas folha, grupos ficam fora do kanban ou como filtro)
  const leafTasks = tasks.filter(t => !t.isGroup)

  const responsibles = Array.from(new Set(leafTasks.map(t => t.responsible).filter(Boolean)))

  const filteredTasks = leafTasks.filter(t => {
    if (filterResponsible !== 'todos' && t.responsible !== filterResponsible) return false
    return true
  })

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
    setDraggedTaskId(taskId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId
    if (!taskId) return

    const nextList = tasks.map(t => {
      if (t.id === taskId) {
        const autoProgress = targetStatus === 'concluido' ? 100 : (t.status === 'concluido' ? 50 : t.progress)
        return {
          ...t,
          status: targetStatus,
          progress: autoProgress,
        }
      }
      return t
    })

    onTasksChange(nextList)
    setDraggedTaskId(null)
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Barra de Filtros do Kanban */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Responsável:</span>
          <select
            value={filterResponsible}
            onChange={e => setFilterResponsible(e.target.value)}
            className="text-xs rounded-xl px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-200 outline-none cursor-pointer"
          >
            <option value="todos">Todos os Responsáveis</option>
            {responsibles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Total: <strong className="text-white">{filteredTasks.length}</strong> atividades ativas
        </div>
      </div>

      {/* Grid das 5 Colunas Kanban */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto min-h-[500px]">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.status)
          const Icon = col.icon

          return (
            <div
              key={col.status}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.status)}
              className="flex flex-col rounded-2xl border bg-slate-900/40 p-3 shadow-lg transition-colors overflow-hidden"
              style={{
                borderColor: col.borderColor,
                background: col.bgColor,
              }}
            >
              {/* Header da Coluna */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: col.color }}
                  />
                  <span className="text-xs font-bold text-slate-200">{col.title}</span>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono"
                  style={{ background: `${col.color}22`, color: col.color }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Lista de Cards */}
              <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-1">
                {colTasks.map(task => {
                  const isCritical = Boolean(task.critical)

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      className={`p-3 rounded-xl border bg-slate-900/90 shadow-md hover:shadow-xl transition-all cursor-grab active:cursor-grabbing group hover:border-orange-500/50 ${
                        isCritical ? 'border-red-500/40' : 'border-slate-800'
                      }`}
                    >
                      {/* Topo do Card: WBS e Caminho Crítico */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {task.wbs}
                        </span>

                        <div className="flex items-center gap-1">
                          {isCritical && (
                            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                              <Flame size={11} /> Crítico
                            </span>
                          )}

                          {task.deliverableIds && task.deliverableIds.length > 0 && (
                            <button
                              onClick={() => onOpenDeliverablesModal?.(task)}
                              className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                              title="Ver entregáveis vinculados"
                            >
                              <FileCheck size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Nome da Tarefa */}
                      <div className="text-xs font-semibold text-slate-100 mb-2 line-clamp-2">
                        {task.name}
                      </div>

                      {/* Tags */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mb-2">
                          {task.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Barra de Progresso */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span>Progresso</span>
                          <span className="font-mono font-bold text-white">{task.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${task.progress}%`,
                              background: col.color,
                            }}
                          />
                        </div>
                      </div>

                      {/* Rodapé do Card: Datas e Responsável */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                        <span className="flex items-center gap-1 truncate max-w-[110px]" title={task.responsible}>
                          <User size={12} className="text-slate-500" />
                          <span className="truncate">{task.responsible}</span>
                        </span>

                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Calendar size={11} className="text-slate-500" />
                          {formatDateBR(task.endDate)}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {colTasks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-slate-800 rounded-xl text-center text-slate-600 text-xs">
                    Nenhuma tarefa aqui
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
