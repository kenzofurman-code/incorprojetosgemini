import React, { useState } from 'react'
import {
  Hash,
  Users,
  User,
  Table,
  Calendar,
  Kanban,
  GitMerge,
  Building2,
  List,
  Clock,
  Plus,
  Share2,
  Sparkles,
  X,
  MoreHorizontal,
} from 'lucide-react'
import type { CronogramaCustomView, ViewFormat } from '../../../types/cronograma'

interface CronogramaViewsHeaderProps {
  projectName: string
  views: CronogramaCustomView[]
  activeViewId: string
  onSelectView: (viewId: string) => void
  onAddView: () => void
  onDeleteView: (viewId: string) => void
}

export default function CronogramaViewsHeader({
  projectName,
  views,
  activeViewId,
  onSelectView,
  onAddView,
  onDeleteView,
}: CronogramaViewsHeaderProps) {
  const getIconForView = (view: CronogramaCustomView) => {
    if (view.responsibleFilter) return <User size={13} className="text-orange-400 shrink-0" />
    if (view.id.includes('canal')) return <Hash size={13} className="text-purple-400 shrink-0" />
    if (view.id.includes('equipe')) return <Users size={13} className="text-blue-400 shrink-0" />

    switch (view.format) {
      case 'tabela':
        return <Table size={13} className="text-emerald-400 shrink-0" />
      case 'gantt':
        return <Calendar size={13} className="text-red-400 shrink-0" />
      case 'kanban':
        return <Kanban size={13} className="text-blue-400 shrink-0" />
      case 'network':
        return <GitMerge size={13} className="text-purple-400 shrink-0" />
      case 'protocolos':
        return <Building2 size={13} className="text-amber-400 shrink-0" />
      case 'timeline':
        return <Clock size={13} className="text-orange-400 shrink-0" />
      default:
        return <List size={13} className="text-slate-400 shrink-0" />
    }
  }

  return (
    <div className="bg-slate-950 border-b border-slate-800 text-xs select-none">
      {/* Top title and actions */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-slate-300 text-[11px]">
            {projectName || 'EQUILÍBRIO - EQUIPE INTERNA'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
            title="Compartilhar visualização"
          >
            <Share2 size={12} />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>

      {/* Horizontal Tabs / Views Bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto scrollbar-none">
        {views.map(view => {
          const isActive = view.id === activeViewId

          return (
            <div
              key={view.id}
              onClick={() => onSelectView(view.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-[11px] transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {getIconForView(view)}
              <span>{view.name}</span>

              {/* Botão de excluir para visualizações customizadas */}
              {!view.isDefault && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    onDeleteView(view.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-opacity ml-1 cursor-pointer"
                  title="Fechar visualização"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )
        })}

        {/* Botão + Visualização */}
        <button
          onClick={onAddView}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer"
          title="Adicionar nova visualização personalizada"
        >
          <Plus size={13} />
          <span>Visualização</span>
        </button>
      </div>
    </div>
  )
}
