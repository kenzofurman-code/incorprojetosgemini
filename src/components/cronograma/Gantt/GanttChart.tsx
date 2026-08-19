/**
 * GanttChart.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Container Principal do Gráfico de Gantt Interativo (100% Nativo).
 * Sincroniza o scroll vertical entre a tabela EAP e a timeline de barras,
 * gerencia filtros e o recálculo topológico contínuo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useMemo, useState } from 'react'
import type { ScheduleTask } from '../../../types/cronograma'
import {
  parseDate,
  formatDateISO,
  diffCalendarDays,
  addBusinessDays,
} from '../../../lib/businessCalendar'
import { recalculateSchedule } from '../../../lib/dependencySchedule'
import GanttHeader, { type GanttZoomLevel } from './GanttHeader'
import GanttTable from './GanttTable'
import GanttTimeline from './GanttTimeline'
import GanttDependencySvg from './GanttDependencySvg'
import GanttToolbar from './GanttToolbar'

interface GanttChartProps {
  tasks: ScheduleTask[]
  onTasksChange: (tasks: ScheduleTask[]) => void
  onLoadTemplate: () => void
  onOpenDeliverablesModal?: (task: ScheduleTask) => void
}

export default function GanttChart({
  tasks,
  onTasksChange,
  onLoadTemplate,
  onOpenDeliverablesModal,
}: GanttChartProps) {
  const [zoom, setZoom] = useState<GanttZoomLevel>(2)
  const [showCriticalOnly, setShowCriticalOnly] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const tableScrollRef = useRef<HTMLDivElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)

  // Sincronização de scroll vertical entre tabela e timeline
  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }

  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }

  // Range de datas do projeto
  const { minDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const today = formatDateISO(new Date())
      return { minDate: today, totalDays: 60 }
    }

    let min = tasks[0].startDate
    let max = tasks[0].endDate

    for (const t of tasks) {
      if (t.startDate && parseDate(t.startDate).getTime() < parseDate(min).getTime()) {
        min = t.startDate
      }
      if (t.endDate && parseDate(t.endDate).getTime() > parseDate(max).getTime()) {
        max = t.endDate
      }
    }

    // Adiciona margem de 10 dias antes e 30 dias depois
    const minPadded = new Date(parseDate(min))
    minPadded.setDate(minPadded.getDate() - 7)
    const minDateStr = formatDateISO(minPadded)

    const maxPadded = new Date(parseDate(max))
    maxPadded.setDate(maxPadded.getDate() + 30)

    const span = Math.max(45, diffCalendarDays(minDateStr, formatDateISO(maxPadded)))

    return { minDate: minDateStr, totalDays: span }
  }, [tasks])

  // Filtra tarefas visíveis (respeitando grupos recolhidos e filtro de caminho crítico)
  const visibleTasks = useMemo(() => {
    const collapsedGroupIds = new Set(
      tasks.filter(t => t.isGroup && t.collapsed).map(t => t.id)
    )

    let list = tasks.filter(t => {
      if (t.parentId && collapsedGroupIds.has(t.parentId)) return false
      return true
    })

    if (showCriticalOnly) {
      list = list.filter(t => t.critical || t.isGroup)
    }

    return list
  }, [tasks, showCriticalOnly])

  // Atualização de tarefa individual
  const handleTaskUpdate = (updatedTask: ScheduleTask) => {
    const nextList = tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
    const recalculated = recalculateSchedule(nextList)
    onTasksChange(recalculated)
  }

  // Exclusão de tarefa
  const handleTaskDelete = (taskId: string) => {
    const nextList = tasks.filter(t => t.id !== taskId && t.parentId !== taskId)
    const recalculated = recalculateSchedule(nextList)
    onTasksChange(recalculated)
  }

  // Toggle de expandir/recolher grupo
  const handleToggleCollapse = (groupId: string) => {
    const nextList = tasks.map(t => t.id === groupId ? { ...t, collapsed: !t.collapsed } : t)
    onTasksChange(nextList)
  }

  // Adicionar Nova Tarefa Raiz
  const handleAddTask = () => {
    const today = formatDateISO(new Date())
    const nextIndex = tasks.filter(t => !t.parentId).length + 1
    const newTask: ScheduleTask = {
      id: `task-${Date.now()}`,
      wbs: `${nextIndex}`,
      name: `Nova Atividade ${nextIndex}`,
      startDate: today,
      endDate: addBusinessDays(today, 4),
      durationDays: 5,
      progress: 0,
      status: 'nao_iniciado',
      responsible: 'Responsável',
      predecessors: [],
      color: '#3B82F6',
    }
    const nextList = [...tasks, newTask]
    onTasksChange(recalculateSchedule(nextList))
  }

  // Adicionar Nova Fase / Grupo
  const handleAddGroup = () => {
    const today = formatDateISO(new Date())
    const nextIndex = tasks.filter(t => !t.parentId).length + 1
    const newGroup: ScheduleTask = {
      id: `group-${Date.now()}`,
      wbs: `${nextIndex}`,
      name: `Fase ${nextIndex}: Nova Etapa`,
      startDate: today,
      endDate: addBusinessDays(today, 9),
      durationDays: 10,
      progress: 0,
      status: 'nao_iniciado',
      responsible: 'Coordenação',
      isGroup: true,
      predecessors: [],
      color: '#8B5CF6',
    }
    const nextList = [...tasks, newGroup]
    onTasksChange(recalculateSchedule(nextList))
  }

  // Adicionar Subtarefa dentro de um grupo
  const handleAddSubtask = (parentTask: ScheduleTask) => {
    const children = tasks.filter(t => t.parentId === parentTask.id)
    const subIndex = children.length + 1
    const newSubtask: ScheduleTask = {
      id: `subtask-${Date.now()}`,
      parentId: parentTask.id,
      wbs: `${parentTask.wbs}.${subIndex}`,
      name: `Subtarefa ${parentTask.wbs}.${subIndex}`,
      startDate: parentTask.startDate,
      endDate: addBusinessDays(parentTask.startDate, 4),
      durationDays: 5,
      progress: 0,
      status: 'nao_iniciado',
      responsible: parentTask.responsible,
      predecessors: [],
      color: parentTask.color || '#3B82F6',
    }

    // Insere logo após o grupo ou seus filhos
    const parentIndex = tasks.findIndex(t => t.id === parentTask.id)
    const nextList = [...tasks]
    nextList.splice(parentIndex + children.length + 1, 0, newSubtask)
    onTasksChange(recalculateSchedule(nextList))
  }

  // Salvar Linha de Base (Baseline)
  const handleSaveBaseline = () => {
    const nextList = tasks.map(t => ({
      ...t,
      baselineStart: t.startDate,
      baselineEnd: t.endDate,
      baselineDuration: t.durationDays,
    }))
    onTasksChange(nextList)
    alert('Linha de Base (Baseline) gravada com sucesso para todas as atividades!')
  }

  // Recalcular Cronograma Completo
  const handleRecalculate = () => {
    onTasksChange(recalculateSchedule(tasks))
  }

  // Exportar para CSV
  const handleExportCSV = () => {
    const headers = ['WBS', 'Atividade', 'Inicio', 'Termino', 'Duracao_Dias_Uteis', 'Progresso_Pct', 'Status', 'Predecessoras', 'Responsavel']
    const rows = tasks.map(t => [
      `"${t.wbs}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      t.startDate,
      t.endDate,
      t.durationDays,
      t.progress,
      t.status,
      `"${t.predecessors.map(p => p.taskId).join(';')}"`,
      `"${t.responsible}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `cronograma-eap-${Date.now()}.csv`
    link.click()
  }

  // Exportar para JSON
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(tasks, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `cronograma-gantt-${Date.now()}.json`
    link.click()
  }

  // Importar de JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string)
        if (Array.isArray(parsed)) {
          onTasksChange(recalculateSchedule(parsed))
          alert('Cronograma importado com sucesso!')
        }
      } catch (err) {
        alert('Arquivo JSON inválido.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Barra de Ferramentas */}
      <GanttToolbar
        zoom={zoom}
        onZoomChange={setZoom}
        onAddTask={handleAddTask}
        onAddGroup={handleAddGroup}
        onSaveBaseline={handleSaveBaseline}
        onRecalculate={handleRecalculate}
        onLoadTemplate={onLoadTemplate}
        showCriticalOnly={showCriticalOnly}
        onToggleCriticalOnly={() => setShowCriticalOnly(p => !p)}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
      />

      {/* Área Principal do Gráfico de Gantt */}
      <div className="flex-1 flex rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-2xl relative min-h-[500px]">
        {/* Painel Esquerdo: Tabela EAP Inline */}
        <div
          ref={tableScrollRef}
          onScroll={handleTableScroll}
          className="overflow-y-auto overflow-x-hidden border-r border-slate-800"
          style={{ height: 'calc(100vh - 280px)', minHeight: 460 }}
        >
          <GanttTable
            tasks={tasks}
            visibleTasks={visibleTasks}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            onAddSubtask={handleAddSubtask}
            onToggleCollapse={handleToggleCollapse}
            onIndentTask={() => {}}
            onOutdentTask={() => {}}
            onOpenDeliverablesModal={onOpenDeliverablesModal}
            selectedTaskId={selectedTaskId}
            onSelectTask={t => setSelectedTaskId(t.id)}
          />
        </div>

        {/* Painel Direito: Timeline e SVG de Dependências */}
        <div
          ref={timelineScrollRef}
          onScroll={handleTimelineScroll}
          className="flex-1 overflow-auto relative bg-[#0d1620]"
          style={{ height: 'calc(100vh - 280px)', minHeight: 460 }}
        >
          <div className="relative min-w-full">
            {/* Régua Temporal Sticky no Topo */}
            <GanttHeader minDate={minDate} totalDays={totalDays} zoom={zoom} />

            {/* Camada SVG de Conexões e Dependências */}
            <GanttDependencySvg
              tasks={tasks}
              visibleTasks={visibleTasks}
              minDate={minDate}
              totalDays={totalDays}
              zoom={zoom}
              totalHeight={visibleTasks.length * 36}
            />

            {/* Barras de Tarefas Interativas */}
            <GanttTimeline
              tasks={tasks}
              visibleTasks={visibleTasks}
              minDate={minDate}
              totalDays={totalDays}
              zoom={zoom}
              onTaskUpdate={handleTaskUpdate}
              onTaskSelect={t => setSelectedTaskId(t.id)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
