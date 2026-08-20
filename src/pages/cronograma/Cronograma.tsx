/**
 * Cronograma.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Página Principal do Módulo de Cronograma & Gestão de Atividades do IncorProjetos.
 * Integra em uma base de dados sincronizada:
 *  1. Visualização Multi-Tabelas Estilo ClickUp com Seleção de Colunas e Filtros
 *  2. Sistema de Múltiplas Visualizações no Topo (+ Visualização)
 *  3. Gráfico de Gantt Interativo (100% Nativo em React/SVG com drag e resize)
 *  4. Quadro Kanban Estilo Pipefy com Campos Customizados por Fase
 *  5. Diagrama de Rede PERT / CPM com Caminho Crítico
 *  6. Acompanhamento de Protocolos em Órgãos Públicos
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import type {
  ScheduleTask,
  ProtocoloItem,
  CronogramaCustomView,
} from '../../types/cronograma'
import { getIncorporacaoTemplate, PROTOCOLOS_TEMPLATE } from '../../data/incorporacaoTemplate'
import { recalculateSchedule } from '../../lib/dependencySchedule'

// Componentes das Visualizações
import CronogramaViewsHeader from '../../components/cronograma/Views/CronogramaViewsHeader'
import CreateCustomViewModal from '../../components/cronograma/Views/CreateCustomViewModal'
import MultiTableView from '../../components/cronograma/Table/MultiTableView'
import GanttChart from '../../components/cronograma/Gantt/GanttChart'
import KanbanBoard from '../../components/cronograma/Kanban/KanbanBoard'
import NetworkDiagram from '../../components/cronograma/Network/NetworkDiagram'
import ProtocolosTracker from '../../components/cronograma/Protocolos/ProtocolosTracker'
import TaskDeliverablesModal from '../../components/cronograma/DeliverablesLink/TaskDeliverablesModal'
import PipefyCardModal from '../../components/cronograma/Kanban/PipefyCardModal'

const DEFAULT_VIEWS: CronogramaCustomView[] = [
  {
    id: 'view-equipe-int',
    name: '👥 EQUIPE INT.',
    format: 'tabela',
    isDefault: true,
    groupBy: 'tags',
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
  },
  {
    id: 'view-isabele',
    name: '👤 ISABELE',
    format: 'tabela',
    responsibleFilter: 'Isabele Caroline Tows',
    isDefault: true,
    groupBy: 'tags',
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
  },
  {
    id: 'view-alana',
    name: '👤 ALANA',
    format: 'tabela',
    responsibleFilter: 'Alana',
    isDefault: true,
    groupBy: 'tags',
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
  },
  {
    id: 'view-bianca',
    name: '👤 BIANCA',
    format: 'tabela',
    responsibleFilter: 'Bianca',
    isDefault: true,
    groupBy: 'tags',
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
  },
  {
    id: 'view-thiago',
    name: '👤 THIAGO',
    format: 'tabela',
    responsibleFilter: 'Thiago',
    isDefault: true,
    groupBy: 'tags',
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
  },
  {
    id: 'view-viviane',
    name: '👤 VIVIANE',
    format: 'tabela',
    responsibleFilter: 'Viviane',
    isDefault: true,
    groupBy: 'tags',
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
  },
  {
    id: 'view-estrutura',
    name: '📊 ESTRUTURA INT.',
    format: 'tabela',
    isDefault: true,
    groupBy: 'listName',
    visibleColumns: ['name', 'listName', 'startDate', 'endDate', 'tags', 'responsible', 'priority'],
  },
  {
    id: 'view-gantt',
    name: '📊 Gantt',
    format: 'gantt',
    isDefault: true,
  },
  {
    id: 'view-kanban',
    name: '▦ Quadro',
    format: 'kanban',
    isDefault: true,
  },
  {
    id: 'view-network',
    name: '🔀 Rede PERT',
    format: 'network',
    isDefault: true,
  },
  {
    id: 'view-protocolos',
    name: '🏛️ Protocolos',
    format: 'protocolos',
    isDefault: true,
  },
]

export default function Cronograma() {
  const { currentProject } = useApp()

  // 1. Estado das Tarefas e Protocolos
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [protocolos, setProtocolos] = useState<ProtocoloItem[]>(PROTOCOLOS_TEMPLATE)

  // 2. Estado das Visualizações Customizadas
  const [views, setViews] = useState<CronogramaCustomView[]>(() => {
    const savedViews = localStorage.getItem(`incor_cronograma_views_${currentProject.id}`)
    if (savedViews) {
      try {
        const parsed = JSON.parse(savedViews)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch { /* silence */ }
    }
    return DEFAULT_VIEWS
  })

  const [activeViewId, setActiveViewId] = useState<string>('view-isabele')
  const [isCreateViewModalOpen, setIsCreateViewModalOpen] = useState(false)

  // Modais de Detalhes
  const [selectedTaskForDeliverables, setSelectedTaskForDeliverables] = useState<ScheduleTask | null>(null)
  const [selectedTaskForPipefyModal, setSelectedTaskForPipefyModal] = useState<ScheduleTask | null>(null)

  // Local storage persistence por projeto
  const storageKeyTasks = `incor_cronograma_tasks_${currentProject.id}`
  const storageKeyProt = `incor_cronograma_prot_${currentProject.id}`
  const storageKeyViews = `incor_cronograma_views_${currentProject.id}`

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
      // Enriquece com dados de exemplo da Isabele / Equipe
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

  // Visualização Ativa
  const activeView = useMemo(() => {
    return views.find(v => v.id === activeViewId) || views[0]
  }, [views, activeViewId])

  // Adicionar Nova Visualização
  const handleAddCustomView = (newView: CronogramaCustomView) => {
    const updated = [...views, newView]
    setViews(updated)
    setActiveViewId(newView.id)
    try {
      localStorage.setItem(storageKeyViews, JSON.stringify(updated))
    } catch { /* silence */ }
  }

  // Excluir Visualização Customizada
  const handleDeleteView = (viewId: string) => {
    const updated = views.filter(v => v.id !== viewId)
    setViews(updated)
    if (activeViewId === viewId) {
      setActiveViewId(updated[0]?.id || 'view-gantt')
    }
    try {
      localStorage.setItem(storageKeyViews, JSON.stringify(updated))
    } catch { /* silence */ }
  }

  // Lista de Responsáveis e Tags para o Modal de Criação de Visualizações
  const availableResponsibles = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => {
      if (t.responsible) set.add(t.responsible)
    })
    return Array.from(set)
  }, [tasks])

  const availableTags = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => {
      t.tags?.forEach(tag => set.add(tag))
    })
    return Array.from(set)
  }, [tasks])

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      {/* ── 1. Top Header de Múltiplas Visualizações (ClickUp Style) ─────────── */}
      <CronogramaViewsHeader
        projectName={`EQUILÍBRIO - ${currentProject.name.toUpperCase()}`}
        views={views}
        activeViewId={activeViewId}
        onSelectView={setActiveViewId}
        onAddView={() => setIsCreateViewModalOpen(true)}
        onDeleteView={handleDeleteView}
      />

      {/* ── 2. Conteúdo da Visualização Selecionada ─────────────────────────── */}
      <div className="flex-1 p-3 sm:p-5">
        {activeView.format === 'tabela' && (
          <MultiTableView
            tasks={tasks}
            view={activeView}
            onUpdateTasks={handleTasksChange}
            onOpenTaskDetails={setSelectedTaskForPipefyModal}
            onAddTask={() => {
              const today = new Date().toISOString().split('T')[0]
              const newTask: ScheduleTask = {
                id: `task-${Date.now()}`,
                wbs: `${tasks.length + 1}`,
                name: 'Nova Atividade',
                startDate: today,
                endDate: today,
                durationDays: 1,
                progress: 0,
                status: 'nao_iniciado',
                priority: 'normal',
                responsible: activeView.responsibleFilter || 'Isabele Caroline Tows',
                listName: 'ALTA',
                tags: ['análise', 'equilíbrio'],
                predecessors: [],
              }
              handleTasksChange([...tasks, newTask])
            }}
          />
        )}

        {activeView.format === 'gantt' && (
          <GanttChart
            tasks={tasks}
            onTasksChange={handleTasksChange}
            onLoadTemplate={handleLoadTemplate}
            onOpenDeliverablesModal={setSelectedTaskForDeliverables}
            onOpenPipefyModal={setSelectedTaskForPipefyModal}
          />
        )}

        {activeView.format === 'kanban' && (
          <KanbanBoard
            tasks={tasks}
            onTasksChange={handleTasksChange}
            onOpenDeliverablesModal={setSelectedTaskForDeliverables}
          />
        )}

        {activeView.format === 'network' && (
          <NetworkDiagram
            tasks={tasks}
            onSelectTask={setSelectedTaskForPipefyModal}
          />
        )}

        {activeView.format === 'protocolos' && (
          <ProtocolosTracker
            protocolos={protocolos}
            onProtocolosChange={handleProtocolosChange}
          />
        )}
      </div>

      {/* ── 3. Modais de Detalhes e Criação de Visualizações ─────────────────── */}
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

      <CreateCustomViewModal
        isOpen={isCreateViewModalOpen}
        onClose={() => setIsCreateViewModalOpen(false)}
        onSave={handleAddCustomView}
        availableResponsibles={availableResponsibles}
        availableTags={availableTags}
      />
    </div>
  )
}
