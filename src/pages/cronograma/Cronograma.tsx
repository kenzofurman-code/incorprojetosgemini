/**
 * Cronograma.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Página Principal do Módulo de Cronograma & Gestão de Projetos do IncorProjetos.
 * Abas Principais:
 *  1. ▦ Tabelas (com sub-visualizações estilo ClickUp, + Visualização, [x] e + Adicionar Tabela)
 *  2. 📊 Gantt (Gráfico de Gantt Interativo Nativo)
 *  3. ▦ Quadro / Kanban (Quadro Estilo Pipefy)
 *  4. 🔀 Rede PERT (Diagrama de Rede e Caminho Crítico CPM)
 *  5. 🏛️ Protocolos (Acompanhamento em Órgãos Públicos)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react'
import {
  Table as TableIcon,
  Calendar,
  Kanban,
  GitMerge,
  Building2,
  Sparkles,
  Plus,
} from 'lucide-react'
import { PageHeader } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import type {
  ScheduleTask,
  ProtocoloItem,
  CronogramaMainTab,
} from '../../types/cronograma'
import { getIncorporacaoTemplate, PROTOCOLOS_TEMPLATE } from '../../data/incorporacaoTemplate'
import { recalculateSchedule } from '../../lib/dependencySchedule'

// Componentes
import TableViewsManager from '../../components/cronograma/Table/TableViewsManager'
import GanttChart from '../../components/cronograma/Gantt/GanttChart'
import KanbanBoard from '../../components/cronograma/Kanban/KanbanBoard'
import NetworkDiagram from '../../components/cronograma/Network/NetworkDiagram'
import ProtocolosTracker from '../../components/cronograma/Protocolos/ProtocolosTracker'
import TaskDeliverablesModal from '../../components/cronograma/DeliverablesLink/TaskDeliverablesModal'
import PipefyCardModal from '../../components/cronograma/Kanban/PipefyCardModal'

const MAIN_TABS: { id: CronogramaMainTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'tabelas', label: 'Tabelas', icon: TableIcon },
  { id: 'gantt', label: 'Gantt', icon: Calendar },
  { id: 'kanban', label: 'Quadro', icon: Kanban },
  { id: 'network', label: 'Rede PERT', icon: GitMerge },
  { id: 'protocolos', label: 'Protocolos', icon: Building2 },
]

export default function Cronograma() {
  const { currentProject } = useApp()

  // 1. Aba Principal Ativa
  const [activeMainTab, setActiveMainTab] = useState<CronogramaMainTab>('tabelas')

  // 2. Estado das Tarefas e Protocolos
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [protocolos, setProtocolos] = useState<ProtocoloItem[]>(PROTOCOLOS_TEMPLATE)

  // 3. Modais de Detalhes
  const [selectedTaskForDeliverables, setSelectedTaskForDeliverables] = useState<ScheduleTask | null>(null)
  const [selectedTaskForPipefyModal, setSelectedTaskForPipefyModal] = useState<ScheduleTask | null>(null)

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

      // Se não há tarefas salvas, carrega o template padrão
      const templateTasks = getIncorporacaoTemplate('2026-05-04')
      const enriched = templateTasks.map((t, idx) => ({
        ...t,
        listName: idx % 3 === 0 ? 'ALTA' : idx % 3 === 1 ? 'NATUNE' : 'PROJETOS',
        priority: idx % 4 === 0 ? ('urgente' as const) : idx % 4 === 1 ? ('alta' as const) : ('normal' as const),
        tags: idx % 2 === 0 ? ['análise', 'equilíbrio'] : ['aprovação', 'equilíbrio'],
        responsible: idx % 2 === 0 ? 'Isabele Caroline Tows' : (t.responsible || 'Thiago'),
      }))

      setTasks(recalculateSchedule(enriched))

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
    const recalculated = recalculateSchedule(newTasks)
    setTasks(recalculated)
    try {
      localStorage.setItem(storageKeyTasks, JSON.stringify(recalculated))
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
    const enriched = templateTasks.map((t, idx) => ({
      ...t,
      listName: idx % 3 === 0 ? 'ALTA' : idx % 3 === 1 ? 'NATUNE' : 'PROJETOS',
      priority: idx % 4 === 0 ? ('urgente' as const) : idx % 4 === 1 ? ('alta' as const) : ('normal' as const),
      tags: idx % 2 === 0 ? ['análise', 'equilíbrio'] : ['aprovação', 'equilíbrio'],
      responsible: idx % 2 === 0 ? 'Isabele Caroline Tows' : (t.responsible || 'Thiago'),
    }))
    handleTasksChange(enriched)
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1700px] mx-auto min-h-screen">
      {/* ── 1. Cabeçalho de Navegação Principal do Cronograma ──────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-800">
        <PageHeader
          title={`Cronograma & Gestão • ${currentProject.name}`}
          subtitle="Gerencie prazos, tabelas multi-projetos, dependências e protocolos de aprovação"
        />

        {/* Abas Principais: Tabelas, Gantt, Quadro, Rede PERT, Protocolos */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 shadow-md">
          {MAIN_TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeMainTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 2. Conteúdo da Aba Principal Ativa ──────────────────────────────── */}
      <div className="animate-in fade-in duration-150">
        {activeMainTab === 'tabelas' && (
          <TableViewsManager
            tasks={tasks}
            onUpdateTasks={handleTasksChange}
            onOpenTaskDetails={setSelectedTaskForPipefyModal}
            projectId={currentProject.id}
          />
        )}

        {activeMainTab === 'gantt' && (
          <GanttChart
            tasks={tasks}
            onTasksChange={handleTasksChange}
            onLoadTemplate={handleLoadTemplate}
            onOpenDeliverablesModal={setSelectedTaskForDeliverables}
            onOpenPipefyModal={setSelectedTaskForPipefyModal}
          />
        )}

        {activeMainTab === 'kanban' && (
          <KanbanBoard
            tasks={tasks}
            onTasksChange={handleTasksChange}
            onOpenDeliverablesModal={setSelectedTaskForDeliverables}
          />
        )}

        {activeMainTab === 'network' && (
          <NetworkDiagram
            tasks={tasks}
            onSelectTask={setSelectedTaskForPipefyModal}
          />
        )}

        {activeMainTab === 'protocolos' && (
          <ProtocolosTracker
            protocolos={protocolos}
            onProtocolosChange={handleProtocolosChange}
          />
        )}
      </div>

      {/* ── 3. Modais Globais ────────────────────────────────────────────────── */}
      {selectedTaskForDeliverables && (
        <TaskDeliverablesModal
          task={selectedTaskForDeliverables}
          onSave={(updatedTask: ScheduleTask) => {
            handleTasksChange(
              tasks.map(t => (t.id === updatedTask.id ? updatedTask : t))
            )
            setSelectedTaskForDeliverables(null)
          }}
          onClose={() => setSelectedTaskForDeliverables(null)}
        />
      )}

      {selectedTaskForPipefyModal && (
        <PipefyCardModal
          task={selectedTaskForPipefyModal}
          allTasks={tasks}
          onSave={(updatedTask: ScheduleTask) => {
            handleTasksChange(
              tasks.map(t => (t.id === updatedTask.id ? updatedTask : t))
            )
            setSelectedTaskForPipefyModal(null)
          }}
          onClose={() => setSelectedTaskForPipefyModal(null)}
          onOpenDeliverablesModal={(task: ScheduleTask) => {
            setSelectedTaskForPipefyModal(null)
            setSelectedTaskForDeliverables(task)
          }}
        />
      )}
    </div>
  )
}
