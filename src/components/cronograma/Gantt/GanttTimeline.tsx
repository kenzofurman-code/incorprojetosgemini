/**
 * GanttTimeline.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel de Barras de Tarefas do Gráfico de Gantt com Drag & Drop e Resize.
 * Renderiza:
 *  - Barras principais com preenchimento percentual de progresso
 *  - Linha de Base (Baseline) comparativa
 *  - Modo Rollup para grupos e fases recolhidas
 *  - Marcos (Milestones) em formato de diamante
 *  - Abertura do modal completo estilo Pipefy ao clicar na barra da tarefa
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react'
import type { ScheduleTask } from '../../../types/cronograma'
import {
  diffCalendarDays,
  addBusinessDays,
  diffBusinessDays,
  formatDateBR,
} from '../../../lib/businessCalendar'
import { ZOOM_PX_PER_DAY, type GanttZoomLevel } from './GanttHeader'

interface GanttTimelineProps {
  tasks: ScheduleTask[]
  visibleTasks: ScheduleTask[]
  minDate: string
  totalDays: number
  zoom: GanttZoomLevel
  onTaskUpdate: (task: ScheduleTask) => void
  onTaskSelect?: (task: ScheduleTask) => void
  onOpenPipefyModal?: (task: ScheduleTask) => void
}

type DragMode = 'move' | 'resize-start' | 'resize-end' | null

interface DragState {
  taskId: string
  mode: DragMode
  startX: number
  originalStart: string
  originalEnd: string
  originalDuration: number
}

export default function GanttTimeline({
  tasks,
  visibleTasks,
  minDate,
  totalDays,
  zoom,
  onTaskUpdate,
  onTaskSelect,
  onOpenPipefyModal,
}: GanttTimelineProps) {
  const pxPerDay = ZOOM_PX_PER_DAY[zoom]
  const totalWidth = totalDays * pxPerDay

  const [dragState, setDragState] = useState<DragState | null>(null)
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)
  const [hasMoved, setHasMoved] = useState(false)

  // Inicia arrasto
  const handlePointerDown = (
    e: React.PointerEvent,
    task: ScheduleTask,
    mode: DragMode
  ) => {
    if (task.isGroup) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setHasMoved(false)

    setDragState({
      taskId: task.id,
      mode,
      startX: e.clientX,
      originalStart: task.startDate,
      originalEnd: task.endDate,
      originalDuration: task.durationDays,
    })
  }

  // Movimento de arrasto
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return

    const deltaX = e.clientX - dragState.startX
    if (Math.abs(deltaX) > 3) {
      setHasMoved(true)
    }

    const deltaDays = Math.round(deltaX / pxPerDay)
    if (deltaDays === 0) return

    const currentTask = tasks.find(t => t.id === dragState.taskId)
    if (!currentTask) return

    if (dragState.mode === 'move') {
      const newStart = addBusinessDays(dragState.originalStart, deltaDays)
      const newEnd = addBusinessDays(newStart, Math.max(1, currentTask.durationDays) - 1)

      if (newStart !== currentTask.startDate || newEnd !== currentTask.endDate) {
        onTaskUpdate({
          ...currentTask,
          startDate: newStart,
          endDate: newEnd,
        })
      }
    } else if (dragState.mode === 'resize-end') {
      const newEnd = addBusinessDays(dragState.originalEnd, deltaDays)
      const newDuration = diffBusinessDays(currentTask.startDate, newEnd)

      if (newDuration >= 1 && newEnd !== currentTask.endDate) {
        onTaskUpdate({
          ...currentTask,
          endDate: newEnd,
          durationDays: newDuration,
        })
      }
    } else if (dragState.mode === 'resize-start') {
      const newStart = addBusinessDays(dragState.originalStart, deltaDays)
      const newDuration = diffBusinessDays(newStart, currentTask.endDate)

      if (newDuration >= 1 && newStart !== currentTask.startDate) {
        onTaskUpdate({
          ...currentTask,
          startDate: newStart,
          durationDays: newDuration,
        })
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState) {
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch { /* silence */ }

      // Se não houve arrasto significativo, abre o modal Pipefy
      if (!hasMoved) {
        const task = tasks.find(t => t.id === dragState.taskId)
        if (task) {
          onOpenPipefyModal?.(task)
        }
      }

      setDragState(null)
      setHasMoved(false)
    }
  }

  return (
    <div
      className="relative select-none"
      style={{ width: totalWidth, height: visibleTasks.length * 36 }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {visibleTasks.map((task, index) => {
        const left = diffCalendarDays(minDate, task.startDate) * pxPerDay
        const calendarSpan = diffCalendarDays(task.startDate, task.endDate) + 1
        const width = Math.max(16, calendarSpan * pxPerDay)
        const top = index * 36 + 6 // Centro vertical em index * 36 + 16

        // Baseline (Linha de Base)
        let baselineLeft = 0
        let baselineWidth = 0
        if (task.baselineStart && task.baselineEnd) {
          baselineLeft = diffCalendarDays(minDate, task.baselineStart) * pxPerDay
          const baseSpan = diffCalendarDays(task.baselineStart, task.baselineEnd) + 1
          baselineWidth = Math.max(16, baseSpan * pxPerDay)
        }

        const isCritical = Boolean(task.critical)
        const isHovered = hoveredTaskId === task.id
        const isDragging = dragState?.taskId === task.id
        const barColor = isCritical ? '#EF4444' : task.color || '#3B82F6'

        // ── 1. GRUPOS / FASES (ATIVIDADES MÃE) ──────────────────────────────
        if (task.isGroup) {
          const children = tasks.filter(t => t.parentId === task.id)

          return (
            <div
              key={task.id}
              className="absolute h-5 flex items-center group cursor-pointer"
              style={{ left, top, width }}
              onClick={() => {
                onTaskSelect?.(task)
                onOpenPipefyModal?.(task)
              }}
              onMouseEnter={() => setHoveredTaskId(task.id)}
              onMouseLeave={() => setHoveredTaskId(null)}
              title={`${task.name} • ${formatDateBR(task.startDate)} a ${formatDateBR(task.endDate)} (Clique para abrir detalhes)`}
            >
              {/* Barra Sumário / Rollup */}
              {task.collapsed ? (
                // Trilho de Rollup com mini-barras coloridas das tarefas filhas
                <div className="w-full h-3.5 rounded-md bg-slate-800/80 border border-slate-700 relative overflow-hidden flex items-center shadow-md">
                  {children.map(child => {
                    const cLeft = Math.max(0, (diffCalendarDays(task.startDate, child.startDate) * pxPerDay))
                    const cWidth = Math.max(8, (diffCalendarDays(child.startDate, child.endDate) + 1) * pxPerDay)
                    return (
                      <div
                        key={child.id}
                        className="absolute h-2 rounded-xs"
                        style={{
                          left: cLeft,
                          width: cWidth,
                          background: child.color || '#3B82F6',
                          opacity: 0.85,
                        }}
                        title={`${child.name} (${child.progress}%)`}
                      />
                    )
                  })}
                </div>
              ) : (
                // Suporte estilo colchete de fase robusto
                <div className="w-full h-5 relative flex items-center">
                  <div
                    className="w-full h-2.5 rounded-xs"
                    style={{ background: barColor, opacity: 0.85 }}
                  />
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 rounded-l-xs"
                    style={{ background: barColor }}
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 rounded-r-xs"
                    style={{ background: barColor }}
                  />
                </div>
              )}

              {/* Rótulo de texto à direita */}
              <span className="ml-2 text-[11px] font-bold text-slate-300 whitespace-nowrap drop-shadow-sm pointer-events-none">
                {task.name} ({task.progress}%)
              </span>
            </div>
          )
        }

        // ── 2. MARCOS (MILESTONES) ───────────────────────────────────────────
        if (task.isMilestone) {
          return (
            <div
              key={task.id}
              className="absolute h-5 flex items-center group cursor-pointer"
              style={{ left: left - 8, top, width: 24 }}
              onClick={() => {
                onTaskSelect?.(task)
                onOpenPipefyModal?.(task)
              }}
              onMouseEnter={() => setHoveredTaskId(task.id)}
              onMouseLeave={() => setHoveredTaskId(null)}
              title={`${task.name} • ${formatDateBR(task.startDate)} (Clique para abrir detalhes)`}
            >
              <div
                className="w-4 h-4 rotate-45 rounded-xs border border-white/60 shadow-lg transition-transform hover:scale-125 flex items-center justify-center"
                style={{ background: task.progress === 100 ? '#22C55E' : '#F97316' }}
              />
              <span className="ml-3 text-[11px] font-semibold text-orange-300 whitespace-nowrap pointer-events-none">
                {task.name} ({formatDateBR(task.startDate)})
              </span>
            </div>
          )
        }

        // ── 3. TAREFAS NORMAIS (BARRAS COM DRAG, RESIZE E CLIQUE PARA PIPEFY) ─
        return (
          <div
            key={task.id}
            className={`absolute flex flex-col group cursor-pointer ${
              isDragging ? 'z-30 opacity-90 scale-[1.01]' : 'z-10'
            }`}
            style={{ left, top, width }}
            onMouseEnter={() => setHoveredTaskId(task.id)}
            onMouseLeave={() => setHoveredTaskId(null)}
            onClick={() => {
              onTaskSelect?.(task)
            }}
            title={`${task.name} • ${formatDateBR(task.startDate)} a ${formatDateBR(task.endDate)} (${task.durationDays}d) • Clique para abrir card Pipefy`}
          >
            {/* Barra Principal da Tarefa */}
            <div
              className={`h-5 rounded-md relative flex items-center overflow-hidden shadow-md transition-shadow border ${
                isCritical
                  ? 'border-red-400 shadow-red-500/20'
                  : 'border-white/20'
              } ${isHovered ? 'ring-2 ring-orange-400/80 shadow-lg' : ''}`}
              style={{ background: barColor }}
              onPointerDown={e => handlePointerDown(e, task, 'move')}
            >
              {/* Preenchimento de Progresso (%) */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-black/30 transition-all pointer-events-none"
                style={{ width: `${task.progress}%` }}
              />

              {/* Rótulo de porcentagem interno */}
              {width > 38 && (
                <span className="relative z-10 px-2 text-[10px] font-bold text-white font-mono drop-shadow-sm truncate pointer-events-none">
                  {task.progress}%
                </span>
              )}

              {/* Alça de Redimensionar Esquerda (Início) */}
              <div
                className="absolute top-0 bottom-0 left-0 w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/40 hover:bg-white/90 transition-opacity rounded-l-md"
                onPointerDown={e => handlePointerDown(e, task, 'resize-start')}
                title="Arrastar para alterar data de início"
              />

              {/* Alça de Redimensionar Direita (Término) */}
              <div
                className="absolute top-0 bottom-0 right-0 w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/40 hover:bg-white/90 transition-opacity rounded-r-md"
                onPointerDown={e => handlePointerDown(e, task, 'resize-end')}
                title="Arrastar para alterar data de término"
              />
            </div>

            {/* Linha de Base (Baseline cinza inferior) */}
            {task.baselineStart && task.baselineEnd && (
              <div
                className="h-1 rounded-full bg-slate-500/60 mt-0.5 pointer-events-none"
                style={{
                  width: baselineWidth,
                  marginLeft: baselineLeft - left,
                }}
                title={`Linha de Base: ${formatDateBR(task.baselineStart)} a ${formatDateBR(task.baselineEnd)} (${task.baselineDuration || 0}d)`}
              />
            )}

            {/* Nome da tarefa flutuante à direita */}
            <span
              className="absolute left-full top-0 ml-2 text-[11px] font-medium text-slate-300 whitespace-nowrap drop-shadow-xs pointer-events-none"
            >
              {task.name} ({task.durationDays}d)
            </span>
          </div>
        )
      })}
    </div>
  )
}
