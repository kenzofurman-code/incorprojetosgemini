/**
 * NetworkDiagram.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Diagrama de Rede PERT / CPM (Network Diagram) de Alta Precisão.
 * Renderiza o fluxo lógico das atividades através de caixas de processo padrão
 * PMI/AACE (Early Start, Early Finish, Late Start, Late Finish, Folga e Duração),
 * com destaque iluminado do Caminho Crítico.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo } from 'react'
import { Flame, ArrowRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import type { ScheduleTask } from '../../../types/cronograma'
import { formatDateBR } from '../../../lib/businessCalendar'

interface NetworkDiagramProps {
  tasks: ScheduleTask[]
  onSelectTask?: (task: ScheduleTask) => void
}

interface NodePosition {
  task: ScheduleTask
  stage: number
  row: number
  x: number
  y: number
}

const NODE_WIDTH = 220
const NODE_HEIGHT = 100
const STAGE_GAP_X = 80
const ROW_GAP_Y = 30

export default function NetworkDiagram({ tasks, onSelectTask }: NetworkDiagramProps) {
  // Filtra apenas tarefas folhas (exclui grupos para o diagrama PERT puro)
  const leafTasks = useMemo(() => tasks.filter(t => !t.isGroup), [tasks])

  // Calcula estágios topológicos (colunas de precedência)
  const { nodePositions, totalWidth, totalHeight, connections } = useMemo(() => {
    const stageMap = new Map<string, number>()

    // Determina o estágio de cada tarefa
    let changed = true
    let iterations = 0
    while (changed && iterations < leafTasks.length * 2) {
      changed = false
      iterations++

      for (const t of leafTasks) {
        if (!t.predecessors || t.predecessors.length === 0) {
          if (!stageMap.has(t.id)) {
            stageMap.set(t.id, 0)
            changed = true
          }
        } else {
          let maxPredStage = 0
          for (const dep of t.predecessors) {
            const predStage = stageMap.get(dep.taskId) ?? 0
            if (predStage + 1 > maxPredStage) {
              maxPredStage = predStage + 1
            }
          }
          if (stageMap.get(t.id) !== maxPredStage) {
            stageMap.set(t.id, maxPredStage)
            changed = true
          }
        }
      }
    }

    // Agrupa tarefas por estágio
    const stages: Map<number, ScheduleTask[]> = new Map()
    for (const t of leafTasks) {
      const st = stageMap.get(t.id) || 0
      const list = stages.get(st) || []
      list.push(t)
      stages.set(st, list)
    }

    const positions: NodePosition[] = []
    let maxStage = 0
    let maxRows = 0

    stages.forEach((taskList, stage) => {
      if (stage > maxStage) maxStage = stage
      if (taskList.length > maxRows) maxRows = taskList.length

      taskList.forEach((task, row) => {
        const x = stage * (NODE_WIDTH + STAGE_GAP_X) + 40
        const y = row * (NODE_HEIGHT + ROW_GAP_Y) + 40
        positions.push({ task, stage, row, x, y })
      })
    })

    // Conexões de setas SVG
    const conns: {
      id: string
      x1: number
      y1: number
      x2: number
      y2: number
      critical: boolean
    }[] = []

    const posMap = new Map<string, NodePosition>()
    positions.forEach(p => posMap.set(p.task.id, p))

    for (const succPos of positions) {
      for (const dep of succPos.task.predecessors || []) {
        const predPos = posMap.get(dep.taskId)
        if (!predPos) continue

        const x1 = predPos.x + NODE_WIDTH
        const y1 = predPos.y + NODE_HEIGHT / 2
        const x2 = succPos.x
        const y2 = succPos.y + NODE_HEIGHT / 2

        const isCritical = Boolean(predPos.task.critical && succPos.task.critical)

        conns.push({
          id: `${predPos.task.id}->${succPos.task.id}`,
          x1,
          y1,
          x2,
          y2,
          critical: isCritical,
        })
      }
    }

    const width = (maxStage + 1) * (NODE_WIDTH + STAGE_GAP_X) + 120
    const height = (maxRows + 1) * (NODE_HEIGHT + ROW_GAP_Y) + 100

    return {
      nodePositions: positions,
      totalWidth: Math.max(800, width),
      totalHeight: Math.max(500, height),
      connections: conns,
    }
  }, [leafTasks])

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Legenda do Diagrama PERT */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-xs border-2 border-red-500 bg-red-500/20" />
            <span className="text-red-300 font-bold flex items-center gap-1">
              <Flame size={12} /> Caminho Crítico (Folga = 0d)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-xs border border-slate-700 bg-slate-800" />
            <span className="text-slate-300">Atividade com Folga</span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Nós: <strong className="text-white">{leafTasks.length}</strong> | Conexões: <strong className="text-orange-400">{connections.length}</strong>
        </div>
      </div>

      {/* Canvas com Nós e Linhas de Conexão */}
      <div className="flex-1 overflow-auto rounded-2xl border border-slate-800 bg-[#0d1620] relative shadow-2xl p-4 min-h-[500px]">
        <div style={{ width: totalWidth, height: totalHeight, position: 'relative' }}>
          {/* SVG de Conexões */}
          <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: totalWidth, height: totalHeight }}>
            <defs>
              <marker
                id="net-arrow-norm"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
              </marker>

              <marker
                id="net-arrow-crit"
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

            {connections.map(c => {
              const deltaX = c.x2 - c.x1
              const midX = c.x1 + deltaX / 2
              const pathD = `M ${c.x1} ${c.y1} C ${midX} ${c.y1}, ${midX} ${c.y2}, ${c.x2 - 4} ${c.y2}`

              return (
                <path
                  key={c.id}
                  d={pathD}
                  fill="none"
                  stroke={c.critical ? '#ef4444' : '#64748b'}
                  strokeWidth={c.critical ? 2.5 : 1.5}
                  strokeOpacity={c.critical ? 0.95 : 0.6}
                  markerEnd={c.critical ? 'url(#net-arrow-crit)' : 'url(#net-arrow-norm)'}
                />
              )
            })}
          </svg>

          {/* Caixas de Nós de Atividade (Padrão PMI) */}
          {nodePositions.map(({ task, x, y }) => {
            const isCritical = Boolean(task.critical)
            const es = task.earlyStart ? formatDateBR(task.earlyStart) : '-'
            const ef = task.earlyFinish ? formatDateBR(task.earlyFinish) : '-'
            const ls = task.lateStart ? formatDateBR(task.lateStart) : '-'
            const lf = task.lateFinish ? formatDateBR(task.lateFinish) : '-'
            const floatDays = task.totalFloat ?? 0

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask?.(task)}
                style={{
                  left: x,
                  top: y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                }}
                className={`absolute z-10 rounded-xl overflow-hidden shadow-lg border transition-transform hover:scale-[1.03] cursor-pointer bg-slate-900 ${
                  isCritical
                    ? 'border-red-500/80 shadow-red-500/20 ring-1 ring-red-500/50'
                    : 'border-slate-800 hover:border-orange-500/60'
                }`}
              >
                {/* Linha Superior: Early Start (ES) e Early Finish (EF) */}
                <div className="grid grid-cols-2 text-[9px] font-mono border-b border-slate-800 bg-slate-950/80 text-slate-400 px-2 py-0.5">
                  <div>ES: <strong className="text-slate-200">{es}</strong></div>
                  <div className="text-right">EF: <strong className="text-slate-200">{ef}</strong></div>
                </div>

                {/* Centro: Nome da Atividade, WBS e Duração */}
                <div className="p-2 flex flex-col justify-between" style={{ height: 56 }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-orange-400">
                      {task.wbs}
                    </span>
                    {isCritical && (
                      <span className="flex items-center gap-0.5 text-[9px] px-1 rounded bg-red-500/20 text-red-400 font-bold">
                        <Flame size={10} /> Crítico
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white truncate" title={task.name}>
                    {task.name}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Dur: <strong className="text-slate-200">{task.durationDays}d</strong></span>
                    <span>Prog: <strong className="text-slate-200">{task.progress}%</strong></span>
                  </div>
                </div>

                {/* Linha Inferior: Late Start (LS), Late Finish (LF) e Folga */}
                <div className="grid grid-cols-3 text-[9px] font-mono border-t border-slate-800 bg-slate-950/80 text-slate-400 px-2 py-0.5">
                  <div>LS: <strong className="text-slate-300">{ls}</strong></div>
                  <div className="text-center">
                    Folga: <strong className={isCritical ? 'text-red-400' : 'text-emerald-400'}>{floatDays}d</strong>
                  </div>
                  <div className="text-right">LF: <strong className="text-slate-300">{lf}</strong></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
