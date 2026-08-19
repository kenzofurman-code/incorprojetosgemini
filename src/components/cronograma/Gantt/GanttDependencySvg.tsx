/**
 * GanttDependencySvg.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Camada SVG Nativa para Renderização da Grade e Setas de Dependência.
 * Traça conexões ortogonais e curvas suaves entre o término da predecessora
 * e o início da sucessora, com destaque em vermelho para o Caminho Crítico.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from 'react'
import type { ScheduleTask } from '../../../types/cronograma'
import { diffCalendarDays, parseDate, formatDateISO } from '../../../lib/businessCalendar'
import { ZOOM_PX_PER_DAY, type GanttZoomLevel } from './GanttHeader'

interface GanttDependencySvgProps {
  tasks: ScheduleTask[]
  visibleTasks: ScheduleTask[]
  minDate: string
  totalDays: number
  zoom: GanttZoomLevel
  totalHeight: number
}

export default function GanttDependencySvg({
  visibleTasks,
  minDate,
  totalDays,
  zoom,
  totalHeight,
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

  // Calcula trajetos das setas de dependência
  const dependencyPaths = useMemo(() => {
    const paths: { id: string; d: string; critical: boolean }[] = []
    const taskIndexMap = new Map<string, number>()
    visibleTasks.forEach((t, i) => taskIndexMap.set(t.id, i))

    for (const succ of visibleTasks) {
      if (!succ.predecessors || succ.predecessors.length === 0) continue

      const succIdx = taskIndexMap.get(succ.id)
      if (succIdx === undefined) continue

      const succX = diffCalendarDays(minDate, succ.startDate) * pxPerDay
      const succY = succIdx * 36 + 18

      for (const dep of succ.predecessors) {
        const predIdx = taskIndexMap.get(dep.taskId)
        if (predIdx === undefined) continue

        const pred = visibleTasks[predIdx]
        const predX = (diffCalendarDays(minDate, pred.endDate) + 1) * pxPerDay
        const predY = predIdx * 36 + 18

        const isCritical = Boolean(succ.critical && pred.critical)

        // Traçado ortogonal inteligente (Finish-to-Start)
        let d = ''
        const deltaX = succX - predX

        if (deltaX >= 16) {
          // Sucessora está à direita com folga: curva S suave
          const midX = predX + deltaX / 2
          d = `M ${predX} ${predY} L ${midX} ${predY} L ${midX} ${succY} L ${succX - 4} ${succY}`
        } else {
          // Sucessora está alinhada ou à esquerda: contorna por trás
          const offsetRight = predX + 12
          const midY = predY < succY ? predY + 18 : predY - 18
          const offsetLeft = succX - 12
          d = `M ${predX} ${predY} L ${offsetRight} ${predY} L ${offsetRight} ${midY} L ${offsetLeft} ${midY} L ${offsetLeft} ${succY} L ${succX - 4} ${succY}`
        }

        paths.push({
          id: `${pred.id}->${succ.id}`,
          d,
          critical: isCritical,
        })
      }
    }

    return paths
  }, [visibleTasks, minDate, pxPerDay])

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-0"
      style={{ width: totalWidth, height: totalHeight }}
    >
      <defs>
        {/* Marcador de seta normal (cinza/ardósia) */}
        <marker
          id="gantt-arrow-normal"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
        </marker>

        {/* Marcador de seta crítica (vermelho/laranja) */}
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

      {/* Setas de dependência */}
      {dependencyPaths.map(p => (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={p.critical ? '#ef4444' : '#64748b'}
          strokeWidth={p.critical ? 2 : 1.5}
          strokeOpacity={p.critical ? 0.95 : 0.65}
          markerEnd={p.critical ? 'url(#gantt-arrow-critical)' : 'url(#gantt-arrow-normal)'}
        />
      ))}
    </svg>
  )
}
