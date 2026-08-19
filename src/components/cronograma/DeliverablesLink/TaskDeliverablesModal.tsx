/**
 * TaskDeliverablesModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal de Vínculo de Entregáveis de Projetos e Cálculo Automático de % Realizado.
 * Conecta a tarefa da EAP às pranchas de projeto reais e calcula o avanço físico
 * baseado no status de entrega e aprovação das pranchas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from 'react'
import {
  X,
  Link2,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  FileText,
} from 'lucide-react'
import type { ScheduleTask } from '../../../types/cronograma'
import { useDrawings } from '../../../hooks/useDrawings'
import { useApp } from '../../../context/AppContext'

interface TaskDeliverablesModalProps {
  task: ScheduleTask
  onSave: (updatedTask: ScheduleTask) => void
  onClose: () => void
}

export default function TaskDeliverablesModal({
  task,
  onSave,
  onClose,
}: TaskDeliverablesModalProps) {
  const { currentProject } = useApp()
  const { drawings } = useDrawings(currentProject.id)

  const [selectedIds, setSelectedIds] = useState<string[]>(task.deliverableIds || [])
  const [currentProgress, setCurrentProgress] = useState<number>(task.progress)

  // Lista de pranchas disponíveis no projeto
  const availableDrawings = useMemo(() => {
    return drawings || []
  }, [drawings])

  // Cálculo de Progresso Sugerido Automático baseado nas pranchas vinculadas
  const { suggestedProgress, approvedCount, submittedCount, totalLinked } = useMemo(() => {
    if (selectedIds.length === 0) {
      return { suggestedProgress: task.progress, approvedCount: 0, submittedCount: 0, totalLinked: 0 }
    }

    let score = 0
    let approved = 0
    let submitted = 0

    for (const id of selectedIds) {
      const dwg = availableDrawings.find(d => d.id === id || d.code === id)
      if (dwg) {
        if (dwg.status === 'aprovado' || dwg.status === 'liberado_para_obra') {
          score += 100
          approved++
          submitted++
        } else if (dwg.status === 'aprovado_com_ressalva') {
          score += 85
          approved++
          submitted++
        } else if (dwg.status === 'em_analise') {
          score += 50 // Entregue / em análise
          submitted++
        } else if (dwg.revision && dwg.revision !== 'R00') {
          score += 60
          submitted++
        } else {
          score += 20 // Em elaboração inicial
        }
      } else {
        score += 50
      }
    }

    const calculated = Math.round(score / selectedIds.length)
    return {
      suggestedProgress: calculated,
      approvedCount: approved,
      submittedCount: submitted,
      totalLinked: selectedIds.length,
    }
  }, [selectedIds, availableDrawings, task.progress])

  const toggleDrawing = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleApplySuggested = () => {
    setCurrentProgress(suggestedProgress)
  }

  const handleSave = () => {
    onSave({
      ...task,
      deliverableIds: selectedIds,
      progress: currentProgress,
      suggestedProgress,
      status: currentProgress === 100 ? 'concluido' : currentProgress > 0 ? 'em_andamento' : 'nao_iniciado',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-700 flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-emerald-400" />
            <div>
              <div className="text-sm font-bold text-white">Vincular Entregáveis de Projetos</div>
              <div className="text-[11px] text-slate-400 font-mono">
                [{task.wbs}] {task.name}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Card de Cálculo Inteligente de Progresso */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                <Sparkles size={14} /> Progresso Realizado Sugerido: {suggestedProgress}%
              </div>
              <div className="text-slate-300 text-[11px]">
                Baseado em <strong>{approvedCount}</strong> prancha(s) aprovada(s) de <strong>{totalLinked}</strong> vinculada(s).
              </div>
            </div>

            <button
              onClick={handleApplySuggested}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              Aplicar {suggestedProgress}%
            </button>
          </div>

          {/* Ajuste do % Atual */}
          <div>
            <label className="block mb-1 font-semibold text-slate-300">
              % Progresso Físico da Atividade
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={currentProgress}
                onChange={e => setCurrentProgress(parseInt(e.target.value, 10))}
                className="flex-1 accent-orange-500"
              />
              <span className="font-mono font-bold text-base text-white w-12 text-right">
                {currentProgress}%
              </span>
            </div>
          </div>

          {/* Lista de Pranchas Disponíveis para Seleção */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2">
              Selecione as Pranchas e Documentos do Projeto:
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-slate-800 rounded-xl p-2 bg-slate-950/60">
              {availableDrawings.map(dwg => {
                const isSelected = selectedIds.includes(dwg.id) || selectedIds.includes(dwg.code)

                return (
                  <div
                    key={dwg.id}
                    onClick={() => toggleDrawing(dwg.code || dwg.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm'
                        : 'bg-slate-900/80 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="accent-emerald-500 rounded"
                      />
                      <FileText size={14} className={isSelected ? 'text-emerald-400' : 'text-slate-500'} />
                      <div className="truncate">
                        <div className="font-mono text-xs font-bold text-slate-200 truncate">
                          {dwg.code}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {dwg.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {dwg.revision || 'R00'}
                      </span>
                      <span className={`text-[10px] font-bold ${
                        dwg.status === 'aprovado' || dwg.status === 'liberado_para_obra' ? 'text-emerald-400' : 'text-yellow-400'
                      }`}>
                        {dwg.status || 'em_analise'}
                      </span>
                    </div>
                  </div>
                )
              })}

              {availableDrawings.length === 0 && (
                <div className="text-center py-4 text-slate-500 text-xs">
                  Nenhuma prancha cadastrada no projeto atual.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-900/80">
          <div className="text-[11px] text-slate-400">
            {selectedIds.length} prancha(s) vinculada(s)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-xl text-slate-300 hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-md active:scale-95"
            >
              Salvar Vínculos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
