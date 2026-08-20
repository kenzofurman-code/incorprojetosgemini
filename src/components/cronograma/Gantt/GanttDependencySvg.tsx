/**
 * GanttDependencySvg.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Camada SVG Nativa para Renderização das Setas de Dependência (FS, SS, FF, SF)
 * e Linha de Conexão Interativa ao Arrastar.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from 'react'
import type { ScheduleTask } from '../../../types/cronograma'
import { diffCalendarDays, parseDate, formatDateISO } from '../../../lib/businessCalendar'
import { ZOOM_PX_PER_DAY, type GanttZoomLevel } from './GanttHeader'

interface ActiveConnectingState {
  fromTaskId: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  hoveredTargetTaskId: string | null
}

interface GanttDependencySvgProps {
  tasks: ScheduleTask[]
  visibleTasks: ScheduleTask[]
  minDate: string
  totalDays: number
  zoom: GanttZoomLevel
  totalHeight: number
  activeConnecting?: ActiveConnectingState | null
}

export default function GanttDependencySvg({
  visibleTasks,
  minDate,
  totalDays,
  zoom,
  totalHeight,
  activeConnecting,
}: GanttDependencySvgProps) {
  const pxPerDay = ZOOM_PX_PER_DAY[zoom]
  const totalWidth = totalDays * pxPerDay
  const todayStr = formatDateISO(new Date())

  // Posição X da linha "Hoje"
  const todayX = useMemo(() => {
    const s = parseDate(minDate).getTime()
    const t = parseDate(todayStr).getTime()
    const days = Math.round((t - s) / 86400000)
    if (days >= 0 && days <= totalDays) {
      return days * pxPerDay + pxPerDay / 2
    }
    return null
  }, [minDate, todayStr, totalDays, pxPerDay])

  // Calcula trajetos das setas de dependência (suporta FS, SS, FF, SF)
  const dependencyPaths = useMemo(() => {
    const paths: { id: string; d: string; critical: boolean }[] = []
    const taskIndexMap = new Map<string, number>()

    visibleTasks.forEach((t, i) => {
      taskIndexMap.set(t.id, i)
      if (t.wbs) taskIndexMap.set(t.wbs, i)
    })

    for (const succ of visibleTasks) {
      if (!succ.predecessors || succ.predecessors.length === 0) continue

      const succIdx = taskIndexMap.get(succ.id)
      if (succIdx === undefined) continue

      const succStartX = diffCalendarDays(minDate, succ.startDate) * pxPerDay
      const succSpan = diffCalendarDays(succ.startDate, succ.endDate) + 1
      const succEndX = (diffCalendarDays(minDate, succ.startDate) + succSpan) * pxPerDay
      const succY = succIdx * 36 + 16

      for (const dep of succ.predecessors) {
        const predIdx = taskIndexMap.get(dep.taskId)
        if (predIdx === undefined) continue

        const pred = visibleTasks[predIdx]
        const predStartX = diffCalendarDays(minDate, pred.startDate) * pxPerDay
        const predSpan = diffCalendarDays(pred.startDate, pred.endDate) + 1
        const predEndX = (diffCalendarDays(minDate, pred.startDate) + predSpan) * pxPerDay
        const predY = predIdx * 36 + 16

        const isCritical = Boolean(succ.critical && pred.critical)
        const type = dep.type || 'FS'

        let startX = predEndX
        let startY = predY
        let targetX = succStartX
        let targetY = succY

        if (type === 'SS') {
          startX = predStartX
          targetX = succStartX
        } else if (type === 'FF') {
          startX = predEndX
          targetX = succEndX
        } else if (type === 'SF') {
          startX = predStartX
          targetX = succEndX
        }

        let d = ''
        const deltaX = targetX - startX

        if (type === 'FS') {
          if (deltaX >= 12) {
            const midX = startX + deltaX / 2
            d = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${targetY} L ${targetX - 4} ${targetY}`
          } else {
            const offsetRight = startX + 12
            const midY = startY < targetY ? startY + 18 : startY - 18
            const offsetLeft = targetX - 12
            d = `M ${startX} ${startY} L ${offsetRight} ${startY} L ${offsetRight} ${midY} L ${offsetLeft} ${midY} L ${offsetLeft} ${targetY} L ${targetX - 4} ${targetY}`
          }
        } else if (type === 'SS') {
          const offsetLeft = Math.min(startX, targetX) - 12
          d = `M ${startX} ${startY} L ${offsetLeft} ${startY} L ${offsetLeft} ${targetY} L ${targetX - 4} ${targetY}`
        } else if (type === 'FF') {
          const offsetRight = Math.max(startX, targetX) + 12
          d = `M ${startX} ${startY} L ${offsetRight} ${startY} L ${offsetRight} ${targetY} L ${targetX + 4} ${targetY}`
        } else {
          // SF
          const offsetLeft = startX - 12
          const offsetRight = targetX + 12
          const midY = startY < targetY ? startY + 18 : startY - 18
          d = `M ${startX} ${startY} L ${offsetLeft} ${startY} L ${offsetLeft} ${midY} L ${offsetRight} ${midY} L ${offsetRight} ${targetY} L ${targetX + 4} ${targetY}`
        }

        paths.push({
          id: `${pred.id}->${succ.id}-${type}`,
          d,
          critical: isCritical,
        })
      }
    }

    return paths
  }, [visibleTasks, minDate, pxPerDay])

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: totalWidth, height: Math.max(totalHeight, 300) }}
    >
      <defs>
        <marker
          id="gantt-arrow-normal"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#94a3b8" />
        </marker>

        <marker
          id="gantt-arrow-critical"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#ef4444" />
        </marker>

        <marker
          id="gantt-arrow-connecting"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#f97316" />
        </marker>
      </defs>

      {/* Linha vertical "HOJE" */}
      {todayX !== null && (
        <g>
          <line
            x1={todayX}
            y1={0}
            x2={todayX}
            y2={totalHeight}
            stroke="#f97316"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.8"
          />
        </g>
      )}

      {/* Setas de dependência existentes */}
      {dependencyPaths.map(p => (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={p.critical ? '#ef4444' : '#94a3b8'}
          strokeWidth={p.critical ? 2 : 1.5}
          strokeOpacity={p.critical ? 0.95 : 0.8}
          markerEnd={p.critical ? 'url(#gantt-arrow-critical)' : 'url(#gantt-arrow-normal)'}
        />
      ))}

      {/* Seta Dinâmica de Conexão sendo Arrastada pelo Usuário */}
      {activeConnecting && (
        <g>
          <path
            d={`M ${activeConnecting.fromX} ${activeConnecting.fromY} C ${(activeConnecting.fromX + activeConnecting.toX) / 2} ${activeConnecting.fromY}, ${(activeConnecting.fromX + activeConnecting.toX) / 2} ${activeConnecting.toY}, ${activeConnecting.toX} ${activeConnecting.toY}`}
            fill="none"
            stroke="#f97316"
            strokeWidth="2.5"
            strokeDasharray="4 3"
            markerEnd="url(#gantt-arrow-connecting)"
            className="animate-pulse"
          />
          <circle
            cx={activeConnecting.fromX}
            cy={activeConnecting.fromY}
            r="4"
            fill="#f97316"
          />
        </g>
      )}
    </svg>
  )
}
