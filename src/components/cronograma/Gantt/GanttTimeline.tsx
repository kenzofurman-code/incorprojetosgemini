/**
 * GanttTimeline.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel de Barras de Tarefas do Gráfico de Gantt:
 *  - Renderização precisa de atividades mãe (englobando todas as filhas de ponta a ponta)
 *  - Criação interativa de dependências por arrasto (drag-to-link) com snap magnético
 *  - Redimensionamento e deslocamento de barras por Drag & Drop
 *  - Abertura de card Pipefy ao clicar
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef } from 'react'
import type { ScheduleTask, DependencyType } from '../../../types/cronograma'
import {
  diffCalendarDays,
  addBusinessDays,
  diffBusinessDays,
  formatDateBR,
  parseDate,
} from '../../../lib/businessCalendar'
import { ZOOM_PX_PER_DAY, type GanttZoomLevel } from './GanttHeader'

export interface ActiveConnectingState {
  fromTaskId: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  hoveredTargetTaskId: string | null
}

interface GanttTimelineProps {
  tasks: ScheduleTask[]
  visibleTasks: ScheduleTask[]
  minDate: string
  totalDays: number
  zoom: GanttZoomLevel
  onTaskUpdate: (task: ScheduleTask) => void
  onTaskSelect?: (task: ScheduleTask) => void
  onOpenPipefyModal?: (task: ScheduleTask) => void
  onAddDependency?: (predTaskId: string, succTaskId: string, type: DependencyType) => void
  onConnectingChange?: (state: ActiveConnectingState | null) => void
}

type DragMode = 'move' | 'resize-start' | 'resize-end' | 'link' | null

interface DragState {
  taskId: string
  mode: DragMode
  startX: number
  originalStart: string
  originalEnd: string
  originalDuration: number
  fromX?: number
  fromY?: number
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
  onAddDependency,
  onConnectingChange,
}: GanttTimelineProps) {
  const pxPerDay = ZOOM_PX_PER_DAY[zoom]
  const totalWidth = totalDays * pxPerDay

  const [dragState, setDragState] = useState<DragState | null>(null)
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)
  const [snapTargetTaskId, setSnapTargetTaskId] = useState<string | null>(null)
  const [hasMoved, setHasMoved] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  // Inicia arrasto de barra ou conector de dependência
  const handlePointerDown = (
    e: React.PointerEvent,
    task: ScheduleTask,
    mode: DragMode
  ) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setHasMoved(false)

    if (mode === 'link') {
      const taskIndex = visibleTasks.findIndex(t => t.id === task.id)
      const taskLeft = diffCalendarDays(minDate, task.startDate) * pxPerDay
      const taskSpan = diffCalendarDays(task.startDate, task.endDate) + 1
      const fromX = taskLeft + (taskSpan * pxPerDay)
      const fromY = taskIndex * 36 + 16

      setDragState({
        taskId: task.id,
        mode: 'link',
        startX: e.clientX,
        originalStart: task.startDate,
        originalEnd: task.endDate,
        originalDuration: task.durationDays,
        fromX,
        fromY,
      })

      onConnectingChange?.({
        fromTaskId: task.id,
        fromX,
        fromY,
        toX: fromX,
        toY: fromY,
        hoveredTargetTaskId: null,
      })
      return
    }

    if (task.isGroup) return

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

    // ── Modo Link: Traçando seta de dependência até outra tarefa ──────────────
    if (dragState.mode === 'link' && dragState.fromX !== undefined && dragState.fromY !== undefined) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const currentMouseX = e.clientX - rect.left
        const currentMouseY = e.clientY - rect.top

        // Detecta tarefa alvo sob o cursor com snap magnético
        const targetRowIndex = Math.floor(currentMouseY / 36)
        let detectedTarget: ScheduleTask | null = null

        if (targetRowIndex >= 0 && targetRowIndex < visibleTasks.length) {
          const candidate = visibleTasks[targetRowIndex]
          if (candidate.id !== dragState.taskId) {
            detectedTarget = candidate
          }
        }

        setSnapTargetTaskId(detectedTarget ? detectedTarget.id : null)

        let targetX = currentMouseX
        let targetY = currentMouseY

        if (detectedTarget) {
          const targetLeft = diffCalendarDays(minDate, detectedTarget.startDate) * pxPerDay
          targetX = targetLeft
          targetY = targetRowIndex * 36 + 16
        }

        onConnectingChange?.({
          fromTaskId: dragState.taskId,
          fromX: dragState.fromX,
          fromY: dragState.fromY,
          toX: targetX,
          toY: targetY,
          hoveredTargetTaskId: detectedTarget ? detectedTarget.id : null,
        })
      }
      return
    }

    // ── Modo Resize / Move ───────────────────────────────────────────────────
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

      // Se estava criando dependência por link e soltou sobre um alvo válido
      if (dragState.mode === 'link') {
        if (snapTargetTaskId && snapTargetTaskId !== dragState.taskId) {
          onAddDependency?.(dragState.taskId, snapTargetTaskId, 'FS')
        }
        onConnectingChange?.(null)
        setSnapTargetTaskId(null)
      } else if (!hasMoved) {
        // Clique sem arrastar abre o modal Pipefy
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
      ref={containerRef}
      className="relative select-none"
      style={{ width: totalWidth, height: visibleTasks.length * 36 }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {visibleTasks.map((task, index) => {
        // Se for grupo/fase, calcula início e fim englobando rigorosamente todas as filhas
        const children = task.isGroup
          ? tasks.filter(t => t.parentId === task.id || (t.wbs && task.wbs && t.wbs.startsWith(task.wbs + '.')))
          : []

        let effectiveStart = task.startDate
        let effectiveEnd = task.endDate

        if (task.isGroup && children.length > 0) {
          effectiveStart = children.reduce((min, c) =>
            parseDate(c.startDate).getTime() < parseDate(min).getTime() ? c.startDate : min,
            children[0].startDate
          )
          effectiveEnd = children.reduce((max, c) =>
            parseDate(c.endDate).getTime() > parseDate(max).getTime() ? c.endDate : max,
            children[0].endDate
          )
        }

        const left = diffCalendarDays(minDate, effectiveStart) * pxPerDay
        const calendarSpan = diffCalendarDays(effectiveStart, effectiveEnd) + 1
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
        const isSnapTarget = snapTargetTaskId === task.id
        const barColor = isCritical ? '#EF4444' : task.color || '#3B82F6'

        // ── 1. GRUPOS / FASES (ATIVIDADES MÃE) ──────────────────────────────
        if (task.isGroup) {
          return (
            <div
              key={task.id}
              className={`absolute h-5 flex items-center group cursor-pointer ${
                isSnapTarget ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 rounded-sm' : ''
              }`}
              style={{ left, top, width }}
              onClick={() => {
                onTaskSelect?.(task)
                onOpenPipefyModal?.(task)
              }}
              onMouseEnter={() => setHoveredTaskId(task.id)}
              onMouseLeave={() => setHoveredTaskId(null)}
              title={`${task.name} • ${formatDateBR(effectiveStart)} a ${formatDateBR(effectiveEnd)} (Clique para abrir detalhes)`}
            >
              {/* Barra Sumário / Rollup */}
              {task.collapsed ? (
                // Trilho de Rollup com mini-barras coloridas das tarefas filhas
                <div className="w-full h-3.5 rounded-md bg-slate-800/80 border border-slate-700 relative overflow-hidden flex items-center shadow-md">
                  {children.map(child => {
                    const cLeft = Math.max(0, (diffCalendarDays(effectiveStart, child.startDate) * pxPerDay))
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
                // Colchete de fase com extremidades verticais precisas
                <div className="w-full h-5 relative flex items-center">
                  <div
                    className="w-full h-2.5 rounded-xs"
                    style={{ background: barColor, opacity: 0.85 }}
                  />
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2.5 rounded-l-xs shadow-sm"
                    style={{ background: barColor }}
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2.5 rounded-r-xs shadow-sm"
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
              className={`absolute h-5 flex items-center group cursor-pointer ${
                isSnapTarget ? 'scale-125' : ''
              }`}
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

        // ── 3. TAREFAS NORMAIS (BARRAS COM DRAG, RESIZE E LINK DE DEPENDÊNCIA)
        return (
          <div
            key={task.id}
            className={`absolute flex flex-col group cursor-pointer ${
              isDragging ? 'z-30 opacity-90 scale-[1.01]' : 'z-10'
            }`}
            style={{ left, top, width }}
            onMouseEnter={() => setHoveredTaskId(task.id)}
            onMouseLeave={() => setHoveredTaskId(null)}
            onClick={() => onTaskSelect?.(task)}
            title={`${task.name} • ${formatDateBR(task.startDate)} a ${formatDateBR(task.endDate)} (${task.durationDays}d) • Clique para abrir card Pipefy`}
          >
            {/* Barra Principal da Tarefa */}
            <div
              className={`h-5 rounded-md relative flex items-center overflow-visible shadow-md transition-all border ${
                isCritical
                  ? 'border-red-400 shadow-red-500/20'
                  : 'border-white/20'
              } ${isHovered ? 'ring-2 ring-orange-400/80 shadow-lg' : ''} ${
                isSnapTarget ? 'ring-3 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''
              }`}
              style={{ background: barColor }}
              onPointerDown={e => handlePointerDown(e, task, 'move')}
            >
              {/* Preenchimento de Progresso (%) */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-black/30 rounded-l-md transition-all pointer-events-none"
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

              {/* ── Conector de Dependência Interativo (Ponto de Ligação FS/TI) ── */}
              <div
                onPointerDown={e => handlePointerDown(e, task, 'link')}
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-orange-500 hover:bg-orange-400 border-2 border-white shadow-lg cursor-crosshair opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-20 hover:scale-125"
                title="Arraste até outra tarefa para criar dependência (Término-Início / FS)"
              >
                <div className="w-1 h-1 rounded-full bg-white pointer-events-none" />
              </div>
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
              className="absolute left-full top-0 ml-3 text-[11px] font-medium text-slate-300 whitespace-nowrap drop-shadow-xs pointer-events-none"
            >
              {task.name} ({task.durationDays}d)
            </span>
          </div>
        )
      })}
    </div>
  )
}
