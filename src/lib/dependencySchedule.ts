/**
 * lib/dependencySchedule.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de Cálculo de Dependências, EAP e CPM (Critical Path Method).
 * Suporta:
 *  - 4 relações do MS Project (FS/TI, SS/II, FF/TT, SF/IT) em Português e Inglês
 *  - Modo com Folgas Permitidas (Permite arrastar tarefas para frente mantendo folga)
 *  - Modo Puxado / Sem Folgas (Elimina folgas puxando sucessoras para a menor data possível)
 *  - Cálculo do Caminho Crítico (CPM) e Rollup Dinâmico de Grupos
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ScheduleTask, TaskDependency, DependencyType } from '../types/cronograma'
import {
  addBusinessDays,
  diffBusinessDays,
  parseDate,
} from './businessCalendar'

/** Mapeamento de tipos em português para o tipo canônico */
const TYPE_MAP: Record<string, DependencyType> = {
  FS: 'FS',
  TI: 'FS',
  SS: 'SS',
  II: 'SS',
  FF: 'FF',
  TT: 'FF',
  SF: 'SF',
  IT: 'SF',
}

/** Converte string de predecessoras no formato MS Project (ex: "2FS+2d, 3TI, 1.1SS") para TaskDependency[] */
export function parsePredecessorsString(str: string, allTasks: ScheduleTask[]): TaskDependency[] {
  if (!str || !str.trim()) return []

  const parts = str.split(',').map(p => p.trim()).filter(Boolean)
  const result: TaskDependency[] = []

  for (const part of parts) {
    // Regex para capturar: ID/WBS + Tipo (FS|TI|SS|II|FF|TT|SF|IT) + Lag (+2d ou -1d)
    const match = part.match(/^([0-9a-zA-Z._-]+)(FS|TI|SS|II|FF|TT|SF|IT)?([+-]\d+)?d?$/i)
    if (!match) continue

    const idOrWbs = match[1]
    const rawType = match[2]?.toUpperCase() || 'FS'
    const type: DependencyType = TYPE_MAP[rawType] || 'FS'
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
      const predTask = allTasks.find(t => t.id === dep.taskId || t.wbs === dep.taskId)
      const label = predTask ? (predTask.wbs || predTask.name) : dep.taskId
      const typeStr = dep.type || 'FS'
      const lagStr = dep.lagDays && dep.lagDays !== 0
        ? (dep.lagDays > 0 ? `+${dep.lagDays}d` : `${dep.lagDays}d`)
        : ''
      return `${label}${typeStr}${lagStr}`
    })
    .join(', ')
}

export interface RecalculateOptions {
  allowSlack?: boolean
  pinnedTaskId?: string
}

/**
 * Recalcula todas as datas da EAP topologicamente a partir das predecessoras
 * e faz o rollup rigoroso das fases/grupos pais.
 *
 * @param tasks Lista de tarefas
 * @param options.allowSlack Se true, permite folgas livres; se false, puxa as sucessoras para a menor data possível
 * @param options.pinnedTaskId ID da tarefa movida manualmente que deve manter sua data
 */
export function recalculateSchedule(
  tasks: ScheduleTask[],
  options: RecalculateOptions = {}
): ScheduleTask[] {
  const { allowSlack = true, pinnedTaskId } = options
  const taskMap = new Map<string, ScheduleTask>()
  tasks.forEach(t => taskMap.set(t.id, { ...t }))

  // 1. Recálculo das Tarefas Folhas baseadas em suas predecessoras (Forward Pass)
  let changed = true
  let iterations = 0
  const maxIterations = tasks.length * 4

  while (changed && iterations < maxIterations) {
    changed = false
    iterations++

    for (const task of taskMap.values()) {
      if (task.isGroup || !task.predecessors || task.predecessors.length === 0) continue

      let maxRequiredStart = '1970-01-01'

      for (const dep of task.predecessors) {
        const pred = taskMap.get(dep.taskId) || Array.from(taskMap.values()).find(t => t.wbs === dep.taskId)
        if (!pred) continue

        const lag = dep.lagDays || 0
        let candidateStart = pred.startDate

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

      if (maxRequiredStart === '1970-01-01') continue

      if (allowSlack) {
        // Modo com Folgas:
        // Apenas empurra para frente se a data mínima requerida for superior ao início atual
        if (parseDate(maxRequiredStart).getTime() > parseDate(task.startDate).getTime()) {
          task.startDate = maxRequiredStart
          task.endDate = addBusinessDays(maxRequiredStart, Math.max(1, task.durationDays) - 1)
          changed = true
        }
      } else {
        // Modo Puxado / Sem Folgas (Just-in-Time):
        // Se for a tarefa arrastada manualmente (pinnedTaskId), mantém a data escolhida
        if (task.id === pinnedTaskId) {
          if (parseDate(maxRequiredStart).getTime() > parseDate(task.startDate).getTime()) {
            task.startDate = maxRequiredStart
            task.endDate = addBusinessDays(maxRequiredStart, Math.max(1, task.durationDays) - 1)
            changed = true
          }
        } else {
          // Puxa para a menor data possível
          if (task.startDate !== maxRequiredStart) {
            task.startDate = maxRequiredStart
            task.endDate = addBusinessDays(maxRequiredStart, Math.max(1, task.durationDays) - 1)
            changed = true
          }
        }
      }
    }
  }

  // 2. Rollup Rigoroso de Grupos / Fases Pais (datas min/max e % progresso ponderado)
  const updatedList = Array.from(taskMap.values())
  const groups = updatedList.filter(t => t.isGroup)

  for (const group of groups) {
    const children = updatedList.filter(t => t.parentId === group.id || (t.wbs && group.wbs && t.wbs.startsWith(group.wbs + '.')))
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
 * Cálculo do Caminho Crítico (CPM) via Forward/Backward Pass:
 * Identifica Folga Total (Total Float = Late Finish - Early Finish).
 * Atividades com folga 0d compõem o Caminho Crítico.
 */
export function calculateCriticalPath(tasks: ScheduleTask[]): ScheduleTask[] {
  const taskMap = new Map<string, ScheduleTask>()
  tasks.forEach(t => taskMap.set(t.id, { ...t, critical: false }))

  // Encontra a data máxima de término de todo o projeto
  let projectEnd = '1970-01-01'
  for (const t of tasks) {
    if (t.endDate && parseDate(t.endDate).getTime() > parseDate(projectEnd).getTime()) {
      projectEnd = t.endDate
    }
  }

  // Backward Pass simplificado
  for (const task of taskMap.values()) {
    if (task.isGroup) continue

    // Verifica se é tarefa final ou se sucessoras dependem dela
    const successors = Array.from(taskMap.values()).filter(t =>
      t.predecessors?.some(p => p.taskId === task.id || p.taskId === task.wbs)
    )

    let lateFinish = projectEnd

    if (successors.length > 0) {
      let minSuccLateStart = projectEnd
      for (const succ of successors) {
        const dep = succ.predecessors.find(p => p.taskId === task.id || p.taskId === task.wbs)
        const lag = dep?.lagDays || 0

        let maxPredEnd = succ.startDate
        if (dep?.type === 'FS') {
          maxPredEnd = addBusinessDays(succ.startDate, -(lag + 1))
        }

        if (parseDate(maxPredEnd).getTime() < parseDate(minSuccLateStart).getTime()) {
          minSuccLateStart = maxPredEnd
        }
      }
      lateFinish = minSuccLateStart
    }

    const lateStart = addBusinessDays(lateFinish, -(task.durationDays - 1))
    const totalFloat = diffBusinessDays(task.endDate, lateFinish) - 1

    task.earlyStart = task.startDate
    task.earlyFinish = task.endDate
    task.lateStart = lateStart
    task.lateFinish = lateFinish
    task.totalFloat = Math.max(0, totalFloat)

    // Caminho Crítico: Folga Total === 0 e não está concluída 100%
    if (task.totalFloat <= 0) {
      task.critical = true
    }
  }

  // Marca os grupos que contêm tarefas críticas
  for (const group of taskMap.values()) {
    if (group.isGroup) {
      const hasCriticalChild = Array.from(taskMap.values()).some(
        t => (t.parentId === group.id || (t.wbs && group.wbs && t.wbs.startsWith(group.wbs + '.'))) && t.critical
      )
      group.critical = hasCriticalChild
    }
  }

  return Array.from(taskMap.values())
}
