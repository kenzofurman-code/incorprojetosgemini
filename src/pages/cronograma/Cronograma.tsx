/**
 * Cronograma.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Página Principal do Módulo de Cronograma Avançado do IncorProjetos.
 * Integra em uma base de dados sincronizada:
 *  1. Gráfico de Gantt Interativo (100% Nativo em React/SVG com drag e resize)
 *  2. Quadro Kanban com Buckets de Status e Drag & Drop
 *  3. Diagrama de Rede PERT / CPM com Caminho Crítico
 *  4. Acompanhamento de Protocolos em Órgãos Públicos
 *  5. Vínculo de Entregáveis e Cálculo Inteligente de % Realizado
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Layers,
  Kanban,
  GitMerge,
  Building2,
  Sparkles,
  Plus,
  Upload,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react'
import { PageHeader } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import type { ScheduleTask, ProtocoloItem, CronogramaViewMode } from '../../types/cronograma'
import { getIncorporacaoTemplate, PROTOCOLOS_TEMPLATE } from '../../data/incorporacaoTemplate'
import { recalculateSchedule } from '../../lib/dependencySchedule'
import GanttChart from '../../components/cronograma/Gantt/GanttChart'
import KanbanBoard from '../../components/cronograma/Kanban/KanbanBoard'
import NetworkDiagram from '../../components/cronograma/Network/NetworkDiagram'
import ProtocolosTracker from '../../components/cronograma/Protocolos/ProtocolosTracker'
import TaskDeliverablesModal from '../../components/cronograma/DeliverablesLink/TaskDeliverablesModal'

export default function Cronograma() {
  const { currentProject } = useApp()

  const [viewMode, setViewMode] = useState<CronogramaViewMode>('gantt')
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [protocolos, setProtocolos] = useState<ProtocoloItem[]>(PROTOCOLOS_TEMPLATE)
  const [selectedTaskForDeliverables, setSelectedTaskForDeliverables] = useState<ScheduleTask | null>(null)

  // Local storage persistence por projeto
  const storageKeyTasks = `incor_cronograma_tasks_${currentProject.id}`
  const storageKeyProt = `incor_cronograma_prot_${currentProject.id}`

  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem(storageKeyTasks)
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(recalculateSchedule(parsed))
          return
        }
      }
      const savedProt = localStorage.getItem(storageKeyProt)
      if (savedProt) {
        const parsed = JSON.parse(savedProt)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProtocolos(parsed)
        }
      }
    } catch { /* silence */ }
  }, [currentProject.id])

  const handleTasksChange = (newTasks: ScheduleTask[]) => {
    setTasks(newTasks)
    try {
      localStorage.setItem(storageKeyTasks, JSON.stringify(newTasks))
    } catch { /* silence */ }
  }

  const handleProtocolosChange = (newProt: ProtocoloItem[]) => {
    setProtocolos(newProt)
    try {
      localStorage.setItem(storageKeyProt, JSON.stringify(newProt))
    } catch { /* silence */ }
  }

  const handleLoadTemplate = () => {
    const templateTasks = getIncorporacaoTemplate('2026-05-04')
    handleTasksChange(templateTasks)
  }

  const handleCreateBlank = () => {
    const today = new Date().toISOString().split('T')[0]
    const initial: ScheduleTask[] = [
      {
        id: 't-1',
        wbs: '1',
        name: 'Primeira Atividade do Projeto',
        startDate: today,
        endDate: today,
        durationDays: 1,
        progress: 0,
        status: 'nao_iniciado',
        responsible: 'Coordenador',
        predecessors: [],
        color: '#3B82F6',
      },
    ]
    handleTasksChange(initial)
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Cabeçalho da Página */}
      <PageHeader
        title="Cronograma do Projeto"
        subtitle={`Planejamento integrado de prazos, EAP, dependências de engenharia e aprovações legais • ${currentProject.name}`}
        actions={
          <div className="flex items-center gap-2">
            {/* Abas de Visualização */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 shadow-md">
              <button
                onClick={() => setViewMode('gantt')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  viewMode === 'gantt'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Calendar size={14} />
                <span>Gantt</span>
              </button>

              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Kanban size={14} />
                <span>Kanban</span>
              </button>

              <button
                onClick={() => setViewMode('network')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  viewMode === 'network'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <GitMerge size={14} />
                <span>Diagrama de Rede</span>
              </button>

              <button
                onClick={() => setViewMode('protocolos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  viewMode === 'protocolos'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Building2 size={14} />
                <span>Protocolos ({protocolos.length})</span>
              </button>
            </div>
          </div>
        }
      />

      {/* Conteúdo Principal conforme ViewMode */}
      <div className="flex-1 overflow-hidden">
        {/* Caso 1: Cronograma em Branco (Empty State Inicial) */}
        {tasks.length === 0 && viewMode !== 'protocolos' ? (
          <div className="h-full flex flex-col items-center justify-center p-8 rounded-3xl border border-slate-800 bg-slate-900/60 text-center">
            <div className="w-16 h-16 rounded-3xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-4 shadow-xl">
              <Calendar size={32} />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Nenhum cronograma ativo neste empreendimento
            </h3>
            <p className="text-xs text-slate-400 max-w-md mb-6">
              Comece carregando o template oficial de incorporação imobiliária ou crie as etapas da sua EAP do zero.
            </p>

            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={handleLoadTemplate}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-white shadow-xl active:scale-95 transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, var(--orange, #f97316), #c2410c)' }}
              >
                <Sparkles size={16} />
                <span>Carregar Template de Incorporação</span>
              </button>

              <button
                onClick={handleCreateBlank}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <Plus size={15} />
                <span>Começar em Branco</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* View 1: Gantt Chart */}
            {viewMode === 'gantt' && (
              <GanttChart
                tasks={tasks}
                onTasksChange={handleTasksChange}
                onLoadTemplate={handleLoadTemplate}
                onOpenDeliverablesModal={task => setSelectedTaskForDeliverables(task)}
              />
            )}

            {/* View 2: Kanban Board */}
            {viewMode === 'kanban' && (
              <KanbanBoard
                tasks={tasks}
                onTasksChange={handleTasksChange}
                onOpenDeliverablesModal={task => setSelectedTaskForDeliverables(task)}
              />
            )}

            {/* View 3: Network Diagram */}
            {viewMode === 'network' && (
              <NetworkDiagram
                tasks={tasks}
                onSelectTask={task => setSelectedTaskForDeliverables(task)}
              />
            )}

            {/* View 4: Protocolos & Órgãos */}
            {viewMode === 'protocolos' && (
              <ProtocolosTracker
                protocolos={protocolos}
                onProtocolosChange={handleProtocolosChange}
              />
            )}
          </>
        )}
      </div>

      {/* Modal de Vínculo de Entregáveis de Projetos */}
      {selectedTaskForDeliverables && (
        <TaskDeliverablesModal
          task={selectedTaskForDeliverables}
          onSave={updatedTask => {
            const nextList = tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
            handleTasksChange(recalculateSchedule(nextList))
            setSelectedTaskForDeliverables(null)
          }}
          onClose={() => setSelectedTaskForDeliverables(null)}
        />
      )}
    </div>
  )
}
