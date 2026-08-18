/**
 * CADIssueModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal de Criação de Issue / RDO / Anotação a partir do Visualizador CAD.
 * Captura o screenshot da prancha com as cotas desenhadas e permite registrar
 * o apontamento técnico.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'
import { MessageSquarePlus, X, Camera, Download, Copy, Check } from 'lucide-react'
import type { IssueCategory } from '../../types'

export interface CADPendingIssue {
  screenshotDataUrl: string
  title?: string
  description?: string
  category?: IssueCategory
  priority?: 'alta' | 'media' | 'baixa'
  fileName?: string
}

export interface CADCreatedIssue {
  id: string
  title: string
  description: string
  category: IssueCategory
  priority: 'alta' | 'media' | 'baixa'
  screenshotDataUrl: string
  createdAt: string
  fileName?: string
}

interface CADIssueModalProps {
  pending: CADPendingIssue
  onConfirm: (issue: CADCreatedIssue) => void
  onCancel: () => void
}

const CATEGORY_OPTIONS: { value: IssueCategory; label: string }[] = [
  { value: 'conflito_projeto', label: '⚠️ Conflito de Projeto / Interferência' },
  { value: 'erro_cota', label: '📐 Erro de Cota / Medida Incorreta' },
  { value: 'compatibilizacao', label: '🔄 Compatibilização de Disciplinas' },
  { value: 'falta_detalhe', label: '🔍 Falta de Detalhamento / Especificação' },
  { value: 'incompletude', label: '📋 Informação Incompleta na Prancha' },
  { value: 'nomenclatura', label: '🏷️ Nomenclatura / Carimbo Incorreto' },
  { value: 'outro', label: '📌 Outros Apontamentos' },
]

export default function CADIssueModal({ pending, onConfirm, onCancel }: CADIssueModalProps) {
  const [title, setTitle] = useState(pending.title || '')
  const [category, setCategory] = useState<IssueCategory>(pending.category || 'conflito_projeto')
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>(pending.priority || 'alta')
  const [description, setDescription] = useState(pending.description || '')
  const [copied, setCopied] = useState(false)

  const handleDownloadImage = () => {
    const a = document.createElement('a')
    a.href = pending.screenshotDataUrl
    a.download = `cad-issue-${Date.now()}.png`
    a.click()
  }

  const handleCopyImage = async () => {
    try {
      const res = await fetch(pending.screenshotDataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Não foi possível copiar a imagem diretamente para a área de transferência.')
    }
  }

  const handleSave = () => {
    if (!title.trim()) return
    const newIssue: CADCreatedIssue = {
      id: `cad-issue-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      screenshotDataUrl: pending.screenshotDataUrl,
      createdAt: new Date().toISOString(),
      fileName: pending.fileName,
    }
    onConfirm(newIssue)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150"
        style={{ background: 'rgba(15, 25, 35, 0.98)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <MessageSquarePlus size={18} className="text-orange-400" />
            <span className="text-sm font-bold text-white">Criar Nova Issue CAD</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Screenshot Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Camera size={13} className="text-orange-400" /> Frame capturado do CAD
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                  title="Copiar imagem"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                  title="Baixar imagem"
                >
                  <Download size={12} /> Baixar
                </button>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/60 shadow-inner flex items-center justify-center">
              <img
                src={pending.screenshotDataUrl}
                alt="Screenshot da prancha CAD"
                className="w-full object-contain max-h-48"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs mb-1.5 block font-semibold text-slate-300">
              Título do Apontamento *
            </label>
            <input
              type="text"
              placeholder="Ex: Diâmetro da tubulação em desacordo com corte A-A"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              className="w-full text-xs rounded-xl px-3 py-2 outline-none bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1.5 block font-semibold text-slate-300">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as IssueCategory)}
                className="w-full text-xs rounded-xl px-3 py-2 outline-none bg-slate-900 border border-slate-700 text-white focus:border-orange-500"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs mb-1.5 block font-semibold text-slate-300">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as 'alta' | 'media' | 'baixa')}
                className="w-full text-xs rounded-xl px-3 py-2 outline-none bg-slate-900 border border-slate-700 text-white focus:border-orange-500"
              >
                <option value="alta">🔴 Alta</option>
                <option value="media">🟡 Média</option>
                <option value="baixa">🟢 Baixa</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs mb-1.5 block font-semibold text-slate-300">Descrição Detalhada</label>
            <textarea
              placeholder="Descreva a divergência encontrada, observações ou recomendações para correção..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full text-xs rounded-xl px-3 py-2 outline-none resize-none bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-900/60">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs rounded-xl text-slate-300 hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40 shadow-lg shadow-orange-600/20 transition-all active:scale-95"
          >
            <MessageSquarePlus size={14} />
            Salvar Issue
          </button>
        </div>
      </div>
    </div>
  )
}
