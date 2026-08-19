/**
 * GanttTable.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Tabela EAP/WBS com Edição Inline em Tempo Real (Estilo MS Project / ClickUp).
 * Suporta:
 *  - Estrutura hierárquica (fases, subtarefas, indentação e collapse)
 *  - Edição de datas, durações em dias úteis, predecessoras e responsáveis
 *  - Ações rápidas (+ Subtarefa, Indentar, Recuar, Vincular Entregáveis, Excluir)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Indent,
  Outdent,
  Link2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  FileCheck,
} from 'lucide-react'
import type { ScheduleTask, TaskStatus } from '../../../types/cronograma'
import {
  formatDateISO,
  formatDateBR,
  addBusinessDays,
  diffBusinessDays,
  parseDate,
} from '../../../lib/businessCalendar'
import {
  parsePredecessorsString,
  formatPredecessorsString,
} from '../../../lib/dependencySchedule'

interface GanttTableProps {
  tasks: ScheduleTask[]
  visibleTasks: ScheduleTask[]
  onTaskUpdate: (task: ScheduleTask) => void
  onTaskDelete: (taskId: string) => void
  onAddSubtask: (parentTask: ScheduleTask) => void
  onToggleCollapse: (taskId: string) => void
  onIndentTask: (task: ScheduleTask) => void
  onOutdentTask: (task: ScheduleTask) => void
  onOpenDeliverablesModal?: (task: ScheduleTask) => void
  selectedTaskId?: string | null
  onSelectTask?: (task: ScheduleTask) => void
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: any }> = {
  nao_iniciado: { label: 'A Fazer', color: '#64748B', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: '#3B82F6', icon: Clock },
  em_revisao:   { label: 'Em Revisão', color: '#EAB308', icon: AlertTriangle },
  concluido:    { label: 'Concluído', color: '#22C55E', icon: CheckCircle2 },
  bloqueado:    { label: 'Bloqueado', color: '#EF4444', icon: AlertTriangle },
}

export default function GanttTable({
  tasks,
  visibleTasks,
  onTaskUpdate,
  onTaskDelete,
  onAddSubtask,
  onToggleCollapse,
  onIndentTask,
  onOutdentTask,
  onOpenDeliverablesModal,
  selectedTaskId,
  onSelectTask,
}: GanttTableProps) {
  const [editingPredId, setEditingPredId] = useState<string | null>(null)
  const [predInputVal, setPredInputVal] = useState('')

  // Nível de profundidade pela WBS (ex: "1" = 0, "1.1" = 1, "1.1.1" = 2)
  const getDepth = (wbs: string) => {
    return (wbs.match(/\./g) || []).length
  }

  const handleStartEditPred = (task: ScheduleTask) => {
    setEditingPredId(task.id)
    setPredInputVal(formatPredecessorsString(task.predecessors, tasks))
  }

  const handleSavePred = (task: ScheduleTask) => {
    const parsed = parsePredecessorsString(predInputVal, tasks)
    onTaskUpdate({
      ...task,
      predecessors: parsed,
    })
    setEditingPredId(null)
  }

  return (
    <div className="w-[520px] lg:w-[600px] flex-shrink-0 border-r border-slate-800 bg-slate-900/90 select-none overflow-x-auto">
      {/* Cabeçalho da Tabela EAP */}
      <div className="sticky top-0 z-20 flex items-center h-[52px] border-b border-slate-800 bg-slate-900/95 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        <div className="w-16 px-2 text-center border-r border-slate-800">EDT/WBS</div>
        <div className="flex-1 px-3 border-r border-slate-800">Atividade / Fase</div>
        <div className="w-20 px-2 text-center border-r border-slate-800">Início</div>
        <div className="w-20 px-2 text-center border-r border-slate-800">Término</div>
        <div className="w-14 px-1 text-center border-r border-slate-800">Dias</div>
        <div className="w-20 px-2 text-center border-r border-slate-800">Predec.</div>
        <div className="w-14 px-1 text-center border-r border-slate-800">%</div>
        <div className="w-20 px-1 text-center border-r border-slate-800">Status</div>
        <div className="w-20 px-2 text-center">Ações</div>
      </div>

      {/* Linhas da Tabela EAP */}
      <div className="divide-y divide-slate-800/80">
        {visibleTasks.map((task, idx) => {
          const depth = getDepth(task.wbs)
          const isSelected = selectedTaskId === task.id
          const isCritical = Boolean(task.critical)
          const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.nao_iniciado

          return (
            <div
              key={task.id}
              className={`flex items-center h-[36px] text-xs transition-colors hover:bg-slate-800/50 ${
                isSelected ? 'bg-orange-500/10 border-l-2 border-orange-500' : ''
              } ${task.isGroup ? 'font-bold bg-slate-900/60' : ''}`}
              onClick={() => onSelectTask?.(task)}
            >
              {/* 1. EDT / WBS */}
              <div className="w-16 px-1.5 text-center font-mono text-[11px] text-slate-400 border-r border-slate-800/60 truncate flex items-center justify-center gap-1">
                {isCritical && (
                  <span title="Caminho Crítico (Folga 0d)">
                    <Flame size={12} className="text-red-500 flex-shrink-0" />
                  </span>
                )}
                <span>{task.wbs}</span>
              </div>

              {/* 2. Nome da Atividade com Recuo Hierárquico */}
              <div
                className="flex-1 px-2 border-r border-slate-800/60 flex items-center gap-1.5 overflow-hidden"
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
              >
                {task.isGroup ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleCollapse(task.id)
                    }}
                    className="p-0.5 rounded hover:bg-white/10 text-slate-400 cursor-pointer"
                  >
                    {task.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </button>
                ) : (
                  <span className="w-3.5" />
                )}

                <input
                  type="text"
                  value={task.name}
                  onChange={(e) => onTaskUpdate({ ...task, name: e.target.value })}
                  className="w-full bg-transparent outline-none border-b border-transparent focus:border-orange-500 text-slate-200 truncate"
                />

                {/* Badge de entregáveis vinculados */}
                {task.deliverableIds && task.deliverableIds.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenDeliverablesModal?.(task)
                    }}
                    className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex-shrink-0"
                    title={`${task.deliverableIds.length} entregável(is) de projeto vinculado(s)`}
                  >
                    <FileCheck size={12} />
                  </button>
                )}
              </div>

              {/* 3. Início */}
              <div className="w-20 px-1 border-r border-slate-800/60 text-center">
                <input
                  type="date"
                  value={task.startDate}
                  disabled={task.isGroup}
                  onChange={(e) => {
                    const newStart = e.target.value
                    if (!newStart) return
                    const newEnd = addBusinessDays(newStart, Math.max(1, task.durationDays) - 1)
                    onTaskUpdate({ ...task, startDate: newStart, endDate: newEnd })
                  }}
                  className="w-full bg-transparent text-[11px] font-mono text-slate-300 text-center outline-none disabled:opacity-50"
                />
              </div>

              {/* 4. Término */}
              <div className="w-20 px-1 border-r border-slate-800/60 text-center">
                <input
                  type="date"
                  value={task.endDate}
                  disabled={task.isGroup}
                  onChange={(e) => {
                    const newEnd = e.target.value
                    if (!newEnd) return
                    const dur = diffBusinessDays(task.startDate, newEnd)
                    onTaskUpdate({ ...task, endDate: newEnd, durationDays: dur })
                  }}
                  className="w-full bg-transparent text-[11px] font-mono text-slate-300 text-center outline-none disabled:opacity-50"
                />
              </div>

              {/* 5. Duração (dias úteis) */}
              <div className="w-14 px-1 border-r border-slate-800/60 text-center">
                <input
                  type="number"
                  min="1"
                  value={task.durationDays}
                  disabled={task.isGroup}
                  onChange={(e) => {
                    const dur = parseInt(e.target.value, 10) || 1
                    const newEnd = addBusinessDays(task.startDate, dur - 1)
                    onTaskUpdate({ ...task, durationDays: dur, endDate: newEnd })
                  }}
                  className="w-full bg-transparent text-[11px] font-mono text-slate-300 text-center outline-none disabled:opacity-50"
                />
              </div>

              {/* 6. Predecessoras */}
              <div className="w-20 px-1 border-r border-slate-800/60 text-center">
                {editingPredId === task.id ? (
                  <input
                    type="text"
                    value={predInputVal}
                    onChange={(e) => setPredInputVal(e.target.value)}
                    onBlur={() => handleSavePred(task)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePred(task)}
                    autoFocus
                    placeholder="ex: 1.1FS+2d"
                    className="w-full bg-slate-800 text-[11px] font-mono text-orange-400 text-center outline-none px-1 rounded"
                  />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartEditPred(task)
                    }}
                    disabled={task.isGroup}
                    className="w-full text-[11px] font-mono text-slate-400 hover:text-orange-400 truncate text-center disabled:opacity-30 cursor-pointer"
                  >
                    {formatPredecessorsString(task.predecessors, tasks) || '-'}
                  </button>
                )}
              </div>

              {/* 7. % Progresso */}
              <div className="w-14 px-1 border-r border-slate-800/60 text-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={task.progress}
                  disabled={task.isGroup}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                    const autoStatus: TaskStatus = val === 100 ? 'concluido' : val > 0 ? 'em_andamento' : 'nao_iniciado'
                    onTaskUpdate({ ...task, progress: val, status: autoStatus })
                  }}
                  className="w-full bg-transparent text-[11px] font-mono text-slate-300 text-center outline-none disabled:opacity-50"
                />
              </div>

              {/* 8. Status */}
              <div className="w-20 px-1 border-r border-slate-800/60 text-center">
                <select
                  value={task.status}
                  onChange={(e) => {
                    const st = e.target.value as TaskStatus
                    const prog = st === 'concluido' ? 100 : (task.progress === 100 ? 50 : task.progress)
                    onTaskUpdate({ ...task, status: st, progress: prog })
                  }}
                  className="w-full bg-transparent text-[10px] font-semibold text-slate-300 outline-none text-center cursor-pointer"
                  style={{ color: statusCfg.color }}
                >
                  <option value="nao_iniciado" className="bg-slate-900 text-slate-300">A Fazer</option>
                  <option value="em_andamento" className="bg-slate-900 text-blue-400">Em Andamento</option>
                  <option value="em_revisao" className="bg-slate-900 text-yellow-400">Em Revisão</option>
                  <option value="concluido" className="bg-slate-900 text-emerald-400">Concluído</option>
                  <option value="bloqueado" className="bg-slate-900 text-red-400">Bloqueado</option>
                </select>
              </div>

              {/* 9. Ações Rápidas */}
              <div className="w-20 px-1 flex items-center justify-center gap-1">
                {task.isGroup && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddSubtask(task)
                    }}
                    className="p-1 rounded hover:bg-orange-500/20 text-slate-400 hover:text-orange-400 cursor-pointer"
                    title="Adicionar subtarefa"
                  >
                    <Plus size={12} />
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenDeliverablesModal?.(task)
                  }}
                  className="p-1 rounded hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 cursor-pointer"
                  title="Vincular entregáveis de projetos e calcular %"
                >
                  <Link2 size={12} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onTaskDelete(task.id)
                  }}
                  className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                  title="Excluir tarefa"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
