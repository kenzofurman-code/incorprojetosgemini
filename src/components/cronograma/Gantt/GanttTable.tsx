/**
 * GanttTable.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Tabela EAP/WBS Tabular com Edição Inline Click-to-Edit (Estilo Excel / MS Project).
 * Suporta:
 *  - Redimensionamento interativo de largura de cada coluna por arrasto
 *  - Visual 100% tabular limpo (sem inputs soltos poluindo a tela)
 *  - Edição inline fluída ao clicar na célula
 *  - Reordenação livre de colunas por Drag & Drop no cabeçalho
 *  - Ações rápidas (+ Subtarefa, Excluir)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  FileCheck,
  GripVertical,
} from 'lucide-react'
import type { ScheduleTask, TaskStatus } from '../../../types/cronograma'
import {
  formatDateBR,
  addBusinessDays,
  diffBusinessDays,
} from '../../../lib/businessCalendar'
import {
  parsePredecessorsString,
  formatPredecessorsString,
} from '../../../lib/dependencySchedule'

export type GanttColumnId =
  | 'wbs'
  | 'name'
  | 'startDate'
  | 'endDate'
  | 'duration'
  | 'predecessors'
  | 'responsible'
  | 'progress'
  | 'status'
  | 'actions'

export interface GanttColumnDef {
  id: GanttColumnId
  label: string
  defaultWidth: number
  minWidth: number
  align?: 'left' | 'center' | 'right'
}

export const DEFAULT_GANTT_COLUMNS: GanttColumnDef[] = [
  { id: 'wbs',          label: 'EDT/WBS',     defaultWidth: 70,  minWidth: 50,  align: 'center' },
  { id: 'name',         label: 'Atividade',   defaultWidth: 260, minWidth: 120, align: 'left' },
  { id: 'startDate',    label: 'Início',      defaultWidth: 95,  minWidth: 75,  align: 'center' },
  { id: 'endDate',      label: 'Término',     defaultWidth: 95,  minWidth: 75,  align: 'center' },
  { id: 'duration',     label: 'Dias',        defaultWidth: 55,  minWidth: 45,  align: 'center' },
  { id: 'predecessors', label: 'Predec.',     defaultWidth: 90,  minWidth: 60,  align: 'center' },
  { id: 'responsible',  label: 'Responsável', defaultWidth: 140, minWidth: 80,  align: 'left' },
  { id: 'progress',     label: '%',           defaultWidth: 55,  minWidth: 45,  align: 'center' },
  { id: 'status',       label: 'Status',      defaultWidth: 110, minWidth: 90,  align: 'center' },
  { id: 'actions',      label: 'Ações',       defaultWidth: 65,  minWidth: 55,  align: 'center' },
]

interface GanttTableProps {
  tasks: ScheduleTask[]
  visibleTasks: ScheduleTask[]
  columnsOrder: GanttColumnId[]
  onColumnsOrderChange: (newOrder: GanttColumnId[]) => void
  onTaskUpdate: (task: ScheduleTask) => void
  onTaskDelete: (taskId: string) => void
  onAddSubtask: (parentTask: ScheduleTask) => void
  onToggleCollapse: (taskId: string) => void
  onOpenDeliverablesModal?: (task: ScheduleTask) => void
  onOpenPipefyModal?: (task: ScheduleTask) => void
  selectedTaskId?: string | null
  onSelectTask?: (task: ScheduleTask) => void
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  nao_iniciado: { label: 'A Fazer', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.3)' },
  em_andamento: { label: 'Em Andamento', color: '#60A5FA', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
  em_revisao:   { label: 'Em Revisão', color: '#FACC15', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)' },
  concluido:    { label: 'Concluído', color: '#4ADE80', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)' },
  bloqueado:    { label: 'Bloqueado', color: '#F87171', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' },
}

export default function GanttTable({
  tasks,
  visibleTasks,
  columnsOrder,
  onColumnsOrderChange,
  onTaskUpdate,
  onTaskDelete,
  onAddSubtask,
  onToggleCollapse,
  onOpenDeliverablesModal,
  onOpenPipefyModal,
  selectedTaskId,
  onSelectTask,
}: GanttTableProps) {
  // Célula ativa em edição inline
  const [editingCell, setEditingCell] = useState<{ taskId: string; columnId: GanttColumnId } | null>(null)
  const [tempValue, setTempValue] = useState<string>('')

  // Larguras individuais de coluna persistidas
  const [colWidths, setColWidths] = useState<Record<GanttColumnId, number>>(() => {
    try {
      const saved = localStorage.getItem('incor_gantt_col_widths')
      if (saved) return JSON.parse(saved)
    } catch { /* silence */ }
    const initial: Record<string, number> = {}
    DEFAULT_GANTT_COLUMNS.forEach(c => { initial[c.id] = c.defaultWidth })
    return initial as Record<GanttColumnId, number>
  })

  // Drag de Reordenação de Colunas
  const [draggedColId, setDraggedColId] = useState<GanttColumnId | null>(null)
  const [dragOverColId, setDragOverColId] = useState<GanttColumnId | null>(null)

  // Drag de Redimensionamento de Colunas
  const resizingRef = useRef<{ colId: GanttColumnId; startX: number; startWidth: number } | null>(null)

  // Map de definições de coluna
  const colDefMap = new Map<GanttColumnId, GanttColumnDef>()
  DEFAULT_GANTT_COLUMNS.forEach(c => colDefMap.set(c.id, c))

  // Largura total da tabela
  const totalTableWidth = columnsOrder.reduce((acc, colId) => {
    return acc + (colWidths[colId] || colDefMap.get(colId)?.defaultWidth || 80)
  }, 0)

  // Nível de profundidade pela WBS
  const getDepth = (wbs: string) => (wbs.match(/\./g) || []).length

  // Inicia edição de uma célula
  const handleStartEdit = (task: ScheduleTask, columnId: GanttColumnId) => {
    if (task.isGroup && (columnId === 'duration' || columnId === 'startDate' || columnId === 'endDate' || columnId === 'predecessors')) {
      return
    }

    setEditingCell({ taskId: task.id, columnId })

    if (columnId === 'name') setTempValue(task.name)
    else if (columnId === 'wbs') setTempValue(task.wbs)
    else if (columnId === 'startDate') setTempValue(task.startDate)
    else if (columnId === 'endDate') setTempValue(task.endDate)
    else if (columnId === 'duration') setTempValue(String(task.durationDays))
    else if (columnId === 'predecessors') setTempValue(formatPredecessorsString(task.predecessors, tasks))
    else if (columnId === 'responsible') setTempValue(task.responsible || '')
    else if (columnId === 'progress') setTempValue(String(task.progress))
  }

  // Salva o valor da célula editada
  const handleSaveEdit = (task: ScheduleTask, columnId: GanttColumnId) => {
    if (!editingCell) return

    if (columnId === 'name') {
      onTaskUpdate({ ...task, name: tempValue.trim() || task.name })
    } else if (columnId === 'wbs') {
      onTaskUpdate({ ...task, wbs: tempValue.trim() || task.wbs })
    } else if (columnId === 'startDate') {
      if (tempValue) {
        const newEnd = addBusinessDays(tempValue, Math.max(1, task.durationDays) - 1)
        onTaskUpdate({ ...task, startDate: tempValue, endDate: newEnd })
      }
    } else if (columnId === 'endDate') {
      if (tempValue) {
        const dur = diffBusinessDays(task.startDate, tempValue)
        onTaskUpdate({ ...task, endDate: tempValue, durationDays: dur })
      }
    } else if (columnId === 'duration') {
      const dur = Math.max(1, parseInt(tempValue, 10) || 1)
      const newEnd = addBusinessDays(task.startDate, dur - 1)
      onTaskUpdate({ ...task, durationDays: dur, endDate: newEnd })
    } else if (columnId === 'predecessors') {
      const parsed = parsePredecessorsString(tempValue, tasks)
      onTaskUpdate({ ...task, predecessors: parsed })
    } else if (columnId === 'responsible') {
      onTaskUpdate({ ...task, responsible: tempValue.trim() })
    } else if (columnId === 'progress') {
      const val = Math.min(100, Math.max(0, parseInt(tempValue, 10) || 0))
      const autoStatus: TaskStatus = val === 100 ? 'concluido' : val > 0 ? 'em_andamento' : 'nao_iniciado'
      onTaskUpdate({ ...task, progress: val, status: autoStatus })
    }

    setEditingCell(null)
  }

  // ── Drag & Drop de Reordenação de Colunas ──────────────────────────────────
  const handleColDragStart = (e: React.DragEvent, colId: GanttColumnId) => {
    setDraggedColId(colId)
    e.dataTransfer.setData('text/plain', colId)
  }

  const handleColDragOver = (e: React.DragEvent, colId: GanttColumnId) => {
    e.preventDefault()
    if (draggedColId && draggedColId !== colId) {
      setDragOverColId(colId)
    }
  }

  const handleColDrop = (e: React.DragEvent, targetColId: GanttColumnId) => {
    e.preventDefault()
    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null)
      setDragOverColId(null)
      return
    }

    const currentOrder = [...columnsOrder]
    const fromIdx = currentOrder.indexOf(draggedColId)
    const toIdx = currentOrder.indexOf(targetColId)

    if (fromIdx !== -1 && toIdx !== -1) {
      currentOrder.splice(fromIdx, 1)
      currentOrder.splice(toIdx, 0, draggedColId)
      onColumnsOrderChange(currentOrder)
    }

    setDraggedColId(null)
    setDragOverColId(null)
  }

  // ── Redimensionamento de Largura da Coluna ─────────────────────────────────
  const handleStartColResize = (e: React.PointerEvent, colId: GanttColumnId) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    resizingRef.current = {
      colId,
      startX: e.clientX,
      startWidth: colWidths[colId] || colDefMap.get(colId)?.defaultWidth || 80,
    }
  }

  const handleColResizeMove = (e: React.PointerEvent) => {
    if (!resizingRef.current) return
    const { colId, startX, startWidth } = resizingRef.current
    const deltaX = e.clientX - startX
    const minW = colDefMap.get(colId)?.minWidth || 45
    const newWidth = Math.max(minW, Math.min(600, startWidth + deltaX))

    setColWidths(prev => {
      const updated = { ...prev, [colId]: newWidth }
      return updated
    })
  }

  const handleColResizeUp = (e: React.PointerEvent) => {
    if (resizingRef.current) {
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch { /* silence */ }
      resizingRef.current = null
      try {
        localStorage.setItem('incor_gantt_col_widths', JSON.stringify(colWidths))
      } catch { /* silence */ }
    }
  }

  return (
    <div
      className="bg-slate-900 select-none overflow-x-auto min-h-full flex flex-col"
      style={{ width: Math.max(totalTableWidth, 300) }}
      onPointerMove={handleColResizeMove}
      onPointerUp={handleColResizeUp}
    >
      {/* ── Cabeçalho Tabular com Drag & Drop e Redimensionamento ────────────── */}
      <div className="sticky top-0 z-20 flex items-center h-[52px] border-b border-slate-800 bg-slate-950/95 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        {columnsOrder.map(colId => {
          const colDef = colDefMap.get(colId)
          if (!colDef) return null

          const width = colWidths[colId] || colDef.defaultWidth
          const isDragging = draggedColId === colId
          const isDragOver = dragOverColId === colId

          return (
            <div
              key={colId}
              style={{ width }}
              className={`h-full px-2 relative flex items-center justify-between border-r border-slate-800 transition-all hover:bg-slate-800/80 hover:text-white ${
                isDragging ? 'opacity-40 bg-orange-500/20' : ''
              } ${isDragOver ? 'border-l-2 border-orange-500 bg-orange-500/10' : ''}`}
            >
              {/* Área arrastável para reordenar coluna */}
              <div
                draggable
                onDragStart={e => handleColDragStart(e, colId)}
                onDragOver={e => handleColDragOver(e, colId)}
                onDrop={e => handleColDrop(e, colId)}
                onDragLeave={() => setDragOverColId(null)}
                className="flex items-center justify-between flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
                title="Clique e arraste para reordenar esta coluna"
              >
                <span className="truncate flex-1 text-center">{colDef.label}</span>
                <GripVertical size={11} className="text-slate-600 opacity-40 hover:opacity-100 flex-shrink-0 ml-1" />
              </div>

              {/* Alça de redimensionamento de largura da coluna */}
              <div
                onPointerDown={e => handleStartColResize(e, colId)}
                className="absolute right-0 top-0 bottom-0 w-2 hover:w-2.5 hover:bg-orange-500/80 cursor-col-resize z-10 transition-colors"
                title="Arraste para redimensionar a largura desta coluna"
              />
            </div>
          )
        })}
      </div>

      {/* ── Linhas da Tabela Tabular EAP ───────────────────────────────────── */}
      <div className="divide-y divide-slate-800/70 flex-1">
        {visibleTasks.map((task, rowIdx) => {
          const depth = getDepth(task.wbs)
          const isSelected = selectedTaskId === task.id
          const isCritical = Boolean(task.critical)
          const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.nao_iniciado

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask?.(task)}
              className={`flex items-center h-[36px] text-xs transition-colors group ${
                isSelected
                  ? 'bg-orange-500/10'
                  : rowIdx % 2 === 0
                  ? 'bg-slate-900/90 hover:bg-slate-800/60'
                  : 'bg-[#0f1722] hover:bg-slate-800/60'
              } ${task.isGroup ? 'font-bold bg-slate-950/70' : ''}`}
            >
              {columnsOrder.map(colId => {
                const colDef = colDefMap.get(colId)
                if (!colDef) return null

                const width = colWidths[colId] || colDef.defaultWidth
                const isEditing = editingCell?.taskId === task.id && editingCell?.columnId === colId

                // ── 1. COLUNA: EDT / WBS ─────────────────────────────────────
                if (colId === 'wbs') {
                  return (
                    <div
                      key={colId}
                      style={{ width }}
                      onClick={() => handleStartEdit(task, 'wbs')}
                      className="h-full px-1.5 flex items-center justify-center font-mono text-[11px] text-slate-400 border-r border-slate-800/70 truncate cursor-text"
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={tempValue}
                          onChange={e => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(task, 'wbs')}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(task, 'wbs')}
                          autoFocus
                          className="w-full text-center bg-slate-800 text-orange-400 font-bold outline-none rounded"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          {isCritical && (
                            <span title="Caminho Crítico (Folga 0d)">
                              <Flame size={12} className="text-red-500 flex-shrink-0" />
                            </span>
                          )}
                          <span>{task.wbs}</span>
                        </div>
                      )}
                    </div>
                  )
                }

                // ── 2. COLUNA: NOME DA ATIVIDADE ─────────────────────────────
                if (colId === 'name') {
                  return (
                    <div
                      key={colId}
                      style={{
                        width,
                        paddingLeft: `${depth * 14 + 8}px`,
                      }}
                      className="h-full px-2 flex items-center gap-1.5 border-r border-slate-800/70 overflow-hidden cursor-pointer"
                    >
                      {task.isGroup ? (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            onToggleCollapse(task.id)
                          }}
                          className="p-0.5 rounded hover:bg-white/10 text-slate-400 flex-shrink-0"
                        >
                          {task.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>
                      ) : (
                        <span className="w-3.5 flex-shrink-0" />
                      )}

                      {isEditing ? (
                        <input
                          type="text"
                          value={tempValue}
                          onChange={e => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(task, 'name')}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(task, 'name')}
                          autoFocus
                          className="w-full bg-slate-800 text-white font-medium outline-none rounded px-1.5 py-0.5 border border-orange-500"
                        />
                      ) : (
                        <span
                          onClick={() => handleStartEdit(task, 'name')}
                          onDoubleClick={() => onOpenPipefyModal?.(task)}
                          className={`truncate text-slate-200 hover:text-orange-400 transition-colors flex-1 ${
                            task.isGroup ? 'font-bold text-white' : 'font-medium'
                          }`}
                          title={`${task.name} (Clique duplo para abrir card completo)`}
                        >
                          {task.name}
                        </span>
                      )}

                      {/* Badge de entregáveis vinculados */}
                      {task.deliverableIds && task.deliverableIds.length > 0 && (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            onOpenDeliverablesModal?.(task)
                          }}
                          className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex-shrink-0"
                          title={`${task.deliverableIds.length} entregável(is) de projeto`}
                        >
                          <FileCheck size={12} />
                        </button>
                      )}
                    </div>
                  )
                }

                // ── 3. COLUNA: INÍCIO ────────────────────────────────────────
                if (colId === 'startDate') {
                  return (
                    <div
                      key={colId}
                      style={{ width }}
                      onClick={() => handleStartEdit(task, 'startDate')}
                      className="h-full px-1.5 flex items-center justify-center font-mono text-[11px] text-slate-300 border-r border-slate-800/70 cursor-text"
                    >
                      {isEditing && !task.isGroup ? (
                        <input
                          type="date"
                          value={tempValue}
                          onChange={e => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(task, 'startDate')}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(task, 'startDate')}
                          autoFocus
                          className="w-full text-center bg-slate-800 text-white text-[11px] font-mono outline-none rounded border border-orange-500 px-0.5"
                        />
                      ) : (
                        <span>{formatDateBR(task.startDate)}</span>
                      )}
                    </div>
                  )
                }

                // ── 4. COLUNA: TÉRMINO ───────────────────────────────────────
                if (colId === 'endDate') {
                  return (
                    <div
                      key={colId}
                      style={{ width }}
                      onClick={() => handleStartEdit(task, 'endDate')}
                      className="h-full px-1.5 flex items-center justify-center font-mono text-[11px] text-slate-300 border-r border-slate-800/70 cursor-text"
                    >
                      {isEditing && !task.isGroup ? (
                        <input
                          type="date"
                          value={tempValue}
                          onChange={e => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(task, 'endDate')}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(task, 'endDate')}
                          autoFocus
                          className="w-full text-center bg-slate-800 text-white text-[11px] font-mono outline-none rounded border border-orange-500 px-0.5"
                        />
                      ) : (
                        <span>{formatDateBR(task.endDate)}</span>
                      )}
                    </div>
                  )
                }

                // ── 5. COLUNA: DURAÇÃO (DIAS) ────────────────────────────────
                if (colId === 'duration') {
                  return (
                    <div
                      key={colId}
                      style={{ width }}
                      onClick={() => handleStartEdit(task, 'duration')}
                      className="h-full px-1 flex items-center justify-center font-mono text-[11px] text-slate-300 border-r border-slate-800/70 cursor-text"
                    >
                      {isEditing && !task.isGroup ? (
                        <input
                          type="number"
                          min="1"
                          value={tempValue}
                          onChange={e => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(task, 'duration')}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(task, 'duration')}
                          autoFocus
                          className="w-full text-center bg-slate-800 text-white font-mono outline-none rounded border border-orange-500 px-0.5"
                        />
                      ) : (
                        <span>{task.durationDays}d</span>
                      )}
                    </div>
                  )
                }

                // ── 6. COLUNA: PREDECESSORAS ─────────────────────────────────
                if (colId === 'predecessors') {
                  const predStr = formatPredecessorsString(task.predecessors, tasks)
                  return (
                    <div
                      key={colId}
                      style={{ width }}
                      onClick={() => handleStartEdit(task, 'predecessors')}
                      className="h-full px-1.5 flex items-center justify-center font-mono text-[11px] text-slate-400 border-r border-slate-800/70 truncate cursor-text"
                    >
                      {isEditing && !task.isGroup ? (
                        <input
                          type="text"
                          value={tempValue}
                          onChange={e => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(task, 'predecessors')}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(task, 'predecessors')}
                          autoFocus
                          placeholder="ex: 1.1FS+2d"
                          className="w-full text-center bg-slate-800 text-orange-400 font-mono outline-none rounded border border-orange-500 px-1"
                        />
                      ) : (
                        <span className="truncate">{predStr || '—'}</span>
                      )}
                    </div>
                  )
                }

                // ── 7. COLUNA: RESPONSÁVEL ───────────────────────────────────
                if (colId === 'responsible') {
                  return (
                    <div
                      key={colId}
                      style={{ width }}
                      onClick={() => handleStartEdit(task, 'responsible')}
                      className="h-full px-2 flex items-center border-r border-slate-800/70 truncate cursor-text"
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={tempValue}
                          onChange={e => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(task, 'responsible')}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(task, 'responsible')}
                          autoFocus
                          className="w-full bg-slate-800 text-white outline-none rounded px-1.5 py-0.5 border border-orange-500 text-xs"
                        />
                      ) : (
                        <span className="truncate text-slate-300 text-xs">{task.responsible || '—'}</span>
                      )}
                    </div>
                  )
                }

                // ── 8. COLUNA: % PROGRESSO ───────────────────────────────────
                if (colId === 'progress') {
                  return (
                    <div
                      key={colId}
                      style={{ width }}
                      onClick={() => handleStartEdit(task, 'progress')}
                      className="h-full px-1 flex items-center justify-center font-mono text-[11px] text-slate-300 border-r border-slate-800/70 cursor-text"
                    >
                      {isEditing && !task.isGroup ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={tempValue}
                          onChange={e => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(task, 'progress')}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(task, 'progress')}
                          autoFocus
                          className="w-full text-center bg-slate-800 text-white font-mono outline-none rounded border border-orange-500 px-0.5"
                        />
                      ) : (
                        <span className={task.progress === 100 ? 'text-emerald-400 font-bold' : ''}>
                          {task.progress}%
                        </span>
                      )}
                    </div>
                  )
                }

                // ── 9. COLUNA: STATUS ────────────────────────────────────────
                if (colId === 'status') {
                  return (
                    <div
                      key={colId}
                      style={{ width }}
                      className="h-full px-1.5 flex items-center justify-center border-r border-slate-800/70"
                    >
                      <select
                        value={task.status}
                        onChange={e => {
                          const st = e.target.value as TaskStatus
                          const prog = st === 'concluido' ? 100 : (task.progress === 100 ? 50 : task.progress)
                          onTaskUpdate({ ...task, status: st, progress: prog })
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg border outline-none cursor-pointer text-center truncate max-w-full"
                        style={{
                          background: statusCfg.bg,
                          color: statusCfg.color,
                          borderColor: statusCfg.border,
                        }}
                      >
                        <option value="nao_iniciado" className="bg-slate-900 text-slate-300">A Fazer</option>
                        <option value="em_andamento" className="bg-slate-900 text-blue-400">Em Andamento</option>
                        <option value="em_revisao" className="bg-slate-900 text-yellow-400">Em Revisão</option>
                        <option value="concluido" className="bg-slate-900 text-emerald-400">Concluído</option>
                        <option value="bloqueado" className="bg-slate-900 text-red-400">Bloqueado</option>
                      </select>
                    </div>
                  )
                }

                // ── 10. COLUNA: AÇÕES ────────────────────────────────────────
                if (colId === 'actions') {
                  return (
                    <div
                      key={colId}
                      style={{ width }}
                      className="h-full px-1 flex items-center justify-center gap-1 border-r border-slate-800/70"
                    >
                      {task.isGroup && (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            onAddSubtask(task)
                          }}
                          className="p-1 rounded hover:bg-orange-500/20 text-slate-400 hover:text-orange-400 cursor-pointer"
                          title="Adicionar subtarefa nesta fase"
                        >
                          <Plus size={12} />
                        </button>
                      )}

                      <button
                        onClick={e => {
                          e.stopPropagation()
                          onTaskDelete(task.id)
                        }}
                        className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                        title="Excluir tarefa"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                }

                return null
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
