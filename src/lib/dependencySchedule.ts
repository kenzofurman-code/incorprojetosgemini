/**
 * lib/dependencySchedule.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de Cálculo de Dependências, EAP e CPM (Critical Path Method).
 * Executa o recálculo topológico das datas a partir das relações de precedência
 * (FS, SS, FF, SF com lag em dias úteis) e determina o Caminho Crítico.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ScheduleTask, TaskDependency, DependencyType } from '../types/cronograma'
import {
  addBusinessDays,
  diffBusinessDays,
  parseDate,
  formatDateISO,
  getNextBusinessDay,
} from './businessCalendar'

/** Converte string de predecessoras no formato MS Project (ex: "2FS+2d, 3SS") para TaskDependency[] */
export function parsePredecessorsString(str: string, allTasks: ScheduleTask[]): TaskDependency[] {
  if (!str || !str.trim()) return []

  const parts = str.split(',').map(p => p.trim()).filter(Boolean)
  const result: TaskDependency[] = []

  for (const part of parts) {
    // Regex para capturar: ID/WBS + Tipo (FS/SS/FF/SF) + Lag (+2d ou -1d)
    const match = part.match(/^([0-9a-zA-Z._-]+)(FS|SS|FF|SF)?([+-]\d+)?d?$/i)
    if (!match) continue

    const idOrWbs = match[1]
    const type = (match[2]?.toUpperCase() as DependencyType) || 'FS'
    const lagDays = match[3] ? parseInt(match[3], 10) : 0

    // Encontra a tarefa pelo ID direto ou pelo código WBS
    const target = allTasks.find(t => t.id === idOrWbs || t.wbs === idOrWbs)
    if (target) {
      result.push({
        taskId: target.id,
        type,
        lagDays,
      })
    }
  }

  return result
}

/** Formata a lista de dependências para exibição na tabela EAP (ex: "1.1FS+2d, 1.2SS") */
export function formatPredecessorsString(predecessors: TaskDependency[], allTasks: ScheduleTask[]): string {
  if (!predecessors || predecessors.length === 0) return ''

  return predecessors
    .map(dep => {
      const predTask = allTasks.find(t => t.id === dep.taskId)
      const label = predTask ? (predTask.wbs || predTask.name) : dep.taskId
      const typeStr = dep.type || 'FS'
      const lagStr = dep.lagDays && dep.lagDays !== 0
        ? (dep.lagDays > 0 ? `+${dep.lagDays}d` : `${dep.lagDays}d`)
        : ''
      return `${label}${typeStr}${lagStr}`
    })
    .join(', ')
}

/**
 * Recalcula todas as datas da EAP topologicamente a partir das predecessoras
 * e faz o rollup das fases/grupos pais.
 */
export function recalculateSchedule(tasks: ScheduleTask[]): ScheduleTask[] {
  const taskMap = new Map<string, ScheduleTask>()
  tasks.forEach(t => taskMap.set(t.id, { ...t }))

  // 1. Recálculo das Tarefas Folhas baseadas em suas predecessoras
  let changed = true
  let iterations = 0
  const maxIterations = tasks.length * 3

  while (changed && iterations < maxIterations) {
    changed = false
    iterations++

    for (const task of taskMap.values()) {
      if (task.isGroup || !task.predecessors || task.predecessors.length === 0) continue

      let maxRequiredStart = task.startDate

      for (const dep of task.predecessors) {
        const pred = taskMap.get(dep.taskId)
        if (!pred) continue

        const lag = dep.lagDays || 0
        let candidateStart = task.startDate

        switch (dep.type) {
          case 'FS': // Término para Início: Começa X dias úteis após o término da predecessora
            candidateStart = addBusinessDays(pred.endDate, lag + 1)
            break
          case 'SS': // Início para Início: Começa X dias úteis após o início da predecessora
            candidateStart = addBusinessDays(pred.startDate, lag)
            break
          case 'FF': { // Término para Término
            const targetEnd = addBusinessDays(pred.endDate, lag)
            candidateStart = addBusinessDays(targetEnd, -(task.durationDays - 1))
            break
          }
          case 'SF': { // Início para Término
            const targetEnd = addBusinessDays(pred.startDate, lag)
            candidateStart = addBusinessDays(targetEnd, -(task.durationDays - 1))
            break
          }
        }

        if (parseDate(candidateStart).getTime() > parseDate(maxRequiredStart).getTime()) {
          maxRequiredStart = candidateStart
        }
      }

      if (maxRequiredStart !== task.startDate) {
        task.startDate = maxRequiredStart
        task.endDate = addBusinessDays(maxRequiredStart, Math.max(1, task.durationDays) - 1)
        changed = true
      }
    }
  }

  // 2. Rollup de Grupos / Fases Pais (datas e % progresso ponderado)
  const updatedList = Array.from(taskMap.values())
  const groups = updatedList.filter(t => t.isGroup)

  for (const group of groups) {
    const children = updatedList.filter(t => t.parentId === group.id || t.wbs.startsWith(group.wbs + '.'))
    if (children.length > 0) {
      let minStart = children[0].startDate
      let maxEnd = children[0].endDate
      let totalDuration = 0
      let weightedProgress = 0

      for (const child of children) {
        if (parseDate(child.startDate).getTime() < parseDate(minStart).getTime()) {
          minStart = child.startDate
        }
        if (parseDate(child.endDate).getTime() > parseDate(maxEnd).getTime()) {
          maxEnd = child.endDate
        }
        const dur = Math.max(1, child.durationDays)
        totalDuration += dur
        weightedProgress += (child.progress || 0) * dur
      }

      group.startDate = minStart
      group.endDate = maxEnd
      group.durationDays = diffBusinessDays(minStart, maxEnd)
      group.progress = totalDuration > 0 ? Math.round(weightedProgress / totalDuration) : 0
    }
  }

  return calculateCriticalPath(updatedList)
}

/**
 * Calcula o Caminho Crítico (CPM / PERT) com Early Start, Early Finish,
 * Late Start, Late Finish e Folga Total (Total Float).
 */
export function calculateCriticalPath(tasks: ScheduleTask[]): ScheduleTask[] {
  if (tasks.length === 0) return tasks

  const taskMap = new Map<string, ScheduleTask>()
  tasks.forEach(t => taskMap.set(t.id, { ...t }))

  // 1. Encontra a data final máxima do projeto inteiro
  let projectEnd = tasks[0].endDate
  for (const t of tasks) {
    if (parseDate(t.endDate).getTime() > parseDate(projectEnd).getTime()) {
      projectEnd = t.endDate
    }
  }

  // 2. Forward Pass: Early Start (ES) e Early Finish (EF)
  for (const t of taskMap.values()) {
    t.earlyStart = t.startDate
    t.earlyFinish = t.endDate
  }

  // 3. Backward Pass: Late Finish (LF) e Late Start (LS)
  // Constrói mapa de sucessores
  const successorMap = new Map<string, { taskId: string; type: DependencyType; lag: number }[]>()
  for (const t of taskMap.values()) {
    for (const dep of t.predecessors || []) {
      const list = successorMap.get(dep.taskId) || []
      list.push({ taskId: t.id, type: dep.type, lag: dep.lagDays || 0 })
      successorMap.set(dep.taskId, list)
    }
  }

  // Percorre em ordem reversa
  const sortedTasks = [...taskMap.values()].sort(
    (a, b) => parseDate(b.endDate).getTime() - parseDate(a.endDate).getTime()
  )

  for (const t of sortedTasks) {
    const succs = successorMap.get(t.id)

    if (!succs || succs.length === 0) {
      t.lateFinish = projectEnd
      t.lateStart = addBusinessDays(projectEnd, -(Math.max(1, t.durationDays) - 1))
    } else {
      let minLateFinish = projectEnd

      for (const s of succs) {
        const succTask = taskMap.get(s.taskId)
        if (!succTask || !succTask.lateStart) continue

        let reqFinish = succTask.lateStart
        if (s.type === 'FS') {
          reqFinish = addBusinessDays(succTask.lateStart, -(s.lag + 1))
        }

        if (parseDate(reqFinish).getTime() < parseDate(minLateFinish).getTime()) {
          minLateFinish = reqFinish
        }
      }

      t.lateFinish = minLateFinish
      t.lateStart = addBusinessDays(minLateFinish, -(Math.max(1, t.durationDays) - 1))
    }

    // Calcula Folga Total (Total Float em dias úteis)
    if (t.earlyStart && t.lateStart) {
      const floatDays = diffBusinessDays(t.earlyStart, t.lateStart) - 1
      t.totalFloat = Math.max(0, floatDays)
      t.critical = t.totalFloat === 0 && !t.isGroup
    }
  }

  return Array.from(taskMap.values())
}
