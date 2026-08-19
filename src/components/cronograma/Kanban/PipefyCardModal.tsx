/**
 * PipefyCardModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal de Detalhes do Card no Padrão Pipefy:
 *  - Formulário com campos padrão globais e campos específicos da fase atual
 *  - Criação dinâmica de novos campos personalizados (texto, número, data, select, moeda)
 *  - Checklist interativo de subtarefas / critérios de aceite
 *  - Histórico de movimentações e comentários de equipe
 *  - Painel de avanço rápido de fase ("Mover card para fase")
 *  - Sincronização em tempo real com o Gráfico de Gantt e Diagrama de Rede
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react'
import {
  X,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Tag,
  Plus,
  Trash2,
  MessageSquare,
  Paperclip,
  CheckSquare,
  ArrowRight,
  Sparkles,
  Link2,
  FileCheck,
  Send,
  Sliders,
  DollarSign,
  FileText,
  Building2,
} from 'lucide-react'
import type {
  ScheduleTask,
  TaskStatus,
  CustomFieldDefinition,
  TaskChecklistItem,
  TaskComment,
  TaskAttachment,
} from '../../../types/cronograma'
import {
  formatDateBR,
  formatDateISO,
  addBusinessDays,
  diffBusinessDays,
} from '../../../lib/businessCalendar'
import { DEFAULT_CUSTOM_FIELDS } from '../../../data/kanbanCustomFields'

interface PipefyCardModalProps {
  task: ScheduleTask
  allTasks: ScheduleTask[]
  onSave: (updatedTask: ScheduleTask) => void
  onClose: () => void
  onOpenDeliverablesModal?: (task: ScheduleTask) => void
}

type ModalTab = 'form' | 'checklist' | 'comments' | 'attachments' | 'history'

const STATUS_LABELS: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  nao_iniciado: { label: 'A Fazer', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.3)' },
  em_andamento: { label: 'Em Andamento', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
  em_revisao:   { label: 'Em Revisão', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)' },
  concluido:    { label: 'Concluído', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)' },
  bloqueado:    { label: 'Bloqueado', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' },
}

export default function PipefyCardModal({
  task,
  allTasks,
  onSave,
  onClose,
  onOpenDeliverablesModal,
}: PipefyCardModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('form')

  // Estado dos dados da tarefa
  const [name, setName] = useState(task.name)
  const [description, setDescription] = useState(task.description || '')
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [responsible, setResponsible] = useState(task.responsible || '')
  const [startDate, setStartDate] = useState(task.startDate)
  const [endDate, setEndDate] = useState(task.endDate)
  const [durationDays, setDurationDays] = useState(task.durationDays)
  const [progress, setProgress] = useState(task.progress)
  const [tags, setTags] = useState<string[]>(task.tags || [])
  const [newTagInput, setNewTagInput] = useState('')
  const [showAddTag, setShowAddTag] = useState(false)

  // Custom Fields (Dicionário de Valores)
  const [customValues, setCustomValues] = useState<Record<string, any>>(task.customFields || {})
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>(DEFAULT_CUSTOM_FIELDS)
  const [showNewFieldModal, setShowNewFieldModal] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<CustomFieldDefinition['type']>('text')
  const [newFieldScope, setNewFieldScope] = useState<'global' | 'bucket'>('bucket')

  // Checklist
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(task.checklist || [
    { id: 'chk-1', title: 'Conferência de cotas e níveis de projeto', completed: false },
    { id: 'chk-2', title: 'Validação de interferências BIM (Clash Detection)', completed: false },
    { id: 'chk-3', title: 'Assinatura técnica da ART / RRT', completed: false },
  ])
  const [newChecklistText, setNewChecklistText] = useState('')

  // Comentários
  const [comments, setComments] = useState<TaskComment[]>(task.comments || [])
  const [newCommentText, setNewCommentText] = useState('')

  // Atualização do valor de um campo personalizado
  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomValues(prev => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  // Adicionar novo campo personalizado
  const handleAddNewField = () => {
    if (!newFieldLabel.trim()) return
    const id = `field_${Date.now()}`
    const newDef: CustomFieldDefinition = {
      id,
      label: newFieldLabel.trim(),
      type: newFieldType,
      bucket: newFieldScope === 'global' ? 'global' : status,
    }
    setCustomFieldDefs(prev => [...prev, newDef])
    setNewFieldLabel('')
    setShowNewFieldModal(false)
  }

  // Checklist toggle
  const handleToggleChecklist = (id: string) => {
    const updated = checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    )
    setChecklist(updated)
  }

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return
    setChecklist(prev => [
      ...prev,
      { id: `chk-${Date.now()}`, title: newChecklistText.trim(), completed: false },
    ])
    setNewChecklistText('')
  }

  // Comentários
  const handleAddComment = () => {
    if (!newCommentText.trim()) return
    const newComment: TaskComment = {
      id: `comm-${Date.now()}`,
      author: 'Você (Engenheiro Coordenador)',
      text: newCommentText.trim(),
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
    setComments(prev => [newComment, ...prev])
    setNewCommentText('')
  }

  // Mudar Status / Fase com botões do painel direito
  const handleMoveToPhase = (newStatus: TaskStatus) => {
    const prevStatus = status
    setStatus(newStatus)
    if (newStatus === 'concluido') {
      setProgress(100)
    } else if (prevStatus === 'concluido') {
      setProgress(50)
    }
  }

  // Salvar tudo de volta na EAP / Gantt
  const handleSaveAll = () => {
    const updatedTask: ScheduleTask = {
      ...task,
      name: name.trim() || task.name,
      description: description.trim() || undefined,
      status,
      responsible: responsible.trim() || task.responsible,
      startDate,
      endDate,
      durationDays,
      progress,
      tags,
      customFields: customValues,
      checklist,
      comments,
    }
    onSave(updatedTask)
    onClose()
  }

  // Filtra campos padrão (globais) e específicos da fase atual
  const globalFields = customFieldDefs.filter(f => f.bucket === 'global')
  const bucketSpecificFields = customFieldDefs.filter(f => f.bucket === status)

  const currentStatusCfg = STATUS_LABELS[status] || STATUS_LABELS.nao_iniciado

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      <div
        className="w-full max-w-6xl max-h-[94vh] rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-700/80 flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* ── 1. TOPO / CABEÇALHO DO CARD (Estilo Pipefy) ───────────────────── */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex flex-col gap-3">
          {/* Linha 1: Badges de Fase e Fechar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Badge da Fase Atual */}
              <span
                className="px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-xs"
                style={{
                  background: currentStatusCfg.bg,
                  color: currentStatusCfg.color,
                  borderColor: currentStatusCfg.border,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: currentStatusCfg.color }} />
                Fase Atual: {currentStatusCfg.label}
              </span>

              {/* WBS */}
              <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs font-bold">
                EDT {task.wbs}
              </span>

              {/* Caminho Crítico */}
              {task.critical && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-500/20 text-red-400 font-bold border border-red-500/30 text-xs">
                  <Flame size={13} /> Caminho Crítico
                </span>
              )}

              {/* Vencimento */}
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs">
                <Calendar size={13} className="text-orange-400" />
                Vencimento: <strong className="text-white">{formatDateBR(endDate)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAll}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, var(--orange, #f97316), #c2410c)' }}
              >
                Salvar Alterações
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Linha 2: Título do Card */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome da Atividade..."
              className="text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-orange-500 outline-none w-full transition-colors"
            />
          </div>

          {/* Linha 3: Tags e Abas Rápidas */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            {/* Tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag size={13} className="text-slate-500" />
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-slate-700"
                >
                  {t}
                  <button
                    onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                    className="hover:text-red-400 text-slate-500"
                  >
                    ×
                  </button>
                </span>
              ))}

              {showAddTag ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newTagInput.trim()) {
                        setTags([...tags, newTagInput.trim()])
                        setNewTagInput('')
                        setShowAddTag(false)
                      }
                    }}
                    autoFocus
                    placeholder="Nome da tag..."
                    className="px-2 py-0.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-white outline-none"
                  />
                  <button
                    onClick={() => {
                      if (newTagInput.trim()) setTags([...tags, newTagInput.trim()])
                      setNewTagInput('')
                      setShowAddTag(false)
                    }}
                    className="text-xs text-orange-400 font-bold px-1.5"
                  >
                    Ok
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddTag(true)}
                  className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800/60 border border-dashed border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={11} /> Tag
                </button>
              )}
            </div>

            {/* Abas Superiores */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('form')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'form' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders size={13} />
                <span>Formulário & Fases</span>
              </button>
              <button
                onClick={() => setActiveTab('checklist')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'checklist' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckSquare size={13} />
                <span>Checklist ({checklist.filter(c => c.completed).length}/{checklist.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'comments' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare size={13} />
                <span>Notas ({comments.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. CORPO DO CARD (3 Colunas Pipefy) ──────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0c141d]">
          {activeTab === 'form' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ── COLUNA 1 (Esquerda): Formulário Padrão Geral (5 Cols) ─────── */}
              <div className="lg:col-span-5 flex flex-col gap-4 border-r border-slate-800/80 pr-0 lg:pr-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-blue-400" /> Formulário Inicial
                  </span>
                  <span className="text-[11px] text-slate-500">Campos Globais</span>
                </div>

                {/* Responsável */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Responsável pela Atividade
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={responsible}
                      onChange={e => setResponsible(e.target.value)}
                      placeholder="Nome do responsável..."
                      className="w-full text-xs rounded-xl pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 text-white outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Datas e Duração */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Início</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => {
                        const s = e.target.value
                        setStartDate(s)
                        setEndDate(addBusinessDays(s, durationDays - 1))
                      }}
                      className="w-full text-xs rounded-xl px-2.5 py-2 bg-slate-900 border border-slate-700 text-white font-mono outline-none text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Término</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => {
                        const end = e.target.value
                        setEndDate(end)
                        setDurationDays(diffBusinessDays(startDate, end))
                      }}
                      className="w-full text-xs rounded-xl px-2.5 py-2 bg-slate-900 border border-slate-700 text-white font-mono outline-none text-center"
                    />
                  </div>
                </div>

                {/* Progresso (%) com Slider */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span>% Progresso Físico Realizado</span>
                    <span className="font-mono text-white text-xs font-bold">{progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10)
                      setProgress(val)
                      if (val === 100) setStatus('concluido')
                      else if (val > 0 && status === 'nao_iniciado') setStatus('em_andamento')
                    }}
                    className="w-full accent-orange-500"
                  />
                </div>

                {/* Descrição Geral */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Descrição do Escopo / Detalhes
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Instruções técnicas, premissas de projeto..."
                    className="w-full text-xs rounded-xl p-3 bg-slate-900 border border-slate-700 text-white outline-none resize-none focus:border-orange-500 placeholder-slate-500"
                  />
                </div>

                {/* Renderiza Campos Globais Customizados */}
                {globalFields.map(field => (
                  <div key={field.id}>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={customValues[field.id] || ''}
                        onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                        className="w-full text-xs rounded-xl px-3 py-2 bg-slate-900 border border-slate-700 text-white outline-none"
                      >
                        <option value="">Selecione...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        value={customValues[field.id] || ''}
                        onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className="w-full text-xs rounded-xl px-3 py-2 bg-slate-900 border border-slate-700 text-white outline-none focus:border-orange-500"
                      />
                    )}
                  </div>
                ))}

                {/* Botão Adicionar Campo Padrão */}
                <button
                  onClick={() => {
                    setNewFieldScope('global')
                    setShowNewFieldModal(true)
                  }}
                  className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-semibold p-2 rounded-xl border border-dashed border-orange-500/30 hover:bg-orange-500/5 transition-colors justify-center cursor-pointer mt-1"
                >
                  <Plus size={13} /> Adicionar campo padrão
                </button>
              </div>

              {/* ── COLUNA 2 (Meio): Campos da Fase Atual (4 Cols) ───────────── */}
              <div className="lg:col-span-4 flex flex-col gap-4 border-r border-slate-800/80 pr-0 lg:pr-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-orange-400" /> Fase: {currentStatusCfg.label}
                  </span>
                  <span className="text-[11px] text-slate-500">Campos da Fase</span>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                  Estes campos são preenchidos especificamente enquanto a atividade estiver na fase <strong>{currentStatusCfg.label}</strong>.
                </div>

                {/* Renderiza Campos Específicos do Bucket */}
                {bucketSpecificFields.map(field => (
                  <div key={field.id}>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={2}
                        value={customValues[field.id] || ''}
                        onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className="w-full text-xs rounded-xl p-3 bg-slate-900 border border-slate-700 text-white outline-none resize-none focus:border-orange-500"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={customValues[field.id] || ''}
                        onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                        className="w-full text-xs rounded-xl px-3 py-2 bg-slate-900 border border-slate-700 text-white outline-none"
                      >
                        <option value="">Selecione...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(customValues[field.id])}
                          onChange={e => handleCustomFieldChange(field.id, e.target.checked)}
                          className="accent-orange-500 rounded"
                        />
                        <span className="text-xs text-slate-300">{field.label}</span>
                      </label>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        value={customValues[field.id] || ''}
                        onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className="w-full text-xs rounded-xl px-3 py-2 bg-slate-900 border border-slate-700 text-white outline-none focus:border-orange-500"
                      />
                    )}
                  </div>
                ))}

                {bucketSpecificFields.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    Nenhum campo específico configurado para esta fase ainda.
                  </div>
                )}

                {/* Botão Adicionar Campo Específico desta Fase */}
                <button
                  onClick={() => {
                    setNewFieldScope('bucket')
                    setShowNewFieldModal(true)
                  }}
                  className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-semibold p-2 rounded-xl border border-dashed border-orange-500/30 hover:bg-orange-500/5 transition-colors justify-center cursor-pointer mt-1"
                >
                  <Plus size={13} /> Adicionar campo desta fase
                </button>
              </div>

              {/* ── COLUNA 3 (Direita): Mover Card para Fase & Ações Rápidas (3 Cols) ─ */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Mover Card para Fase
                  </span>
                </div>

                {/* Botões de Transição Direta de Fase */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleMoveToPhase('concluido')}
                    className={`flex items-center justify-between p-3 rounded-2xl border font-bold text-xs transition-all cursor-pointer ${
                      status === 'concluido'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 shadow-lg'
                        : 'bg-emerald-950/20 hover:bg-emerald-900/30 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={15} /> Concluído
                    </span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    onClick={() => handleMoveToPhase('em_revisao')}
                    className={`flex items-center justify-between p-3 rounded-2xl border font-bold text-xs transition-all cursor-pointer ${
                      status === 'em_revisao'
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300 ring-2 ring-yellow-500/40 shadow-lg'
                        : 'bg-yellow-950/20 hover:bg-yellow-900/30 border-yellow-500/30 text-yellow-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle size={15} /> Em Revisão
                    </span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    onClick={() => handleMoveToPhase('em_andamento')}
                    className={`flex items-center justify-between p-3 rounded-2xl border font-bold text-xs transition-all cursor-pointer ${
                      status === 'em_andamento'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300 ring-2 ring-blue-500/40 shadow-lg'
                        : 'bg-blue-950/20 hover:bg-blue-900/30 border-blue-500/30 text-blue-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Clock size={15} /> Em Andamento
                    </span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    onClick={() => handleMoveToPhase('nao_iniciado')}
                    className={`flex items-center justify-between p-3 rounded-2xl border font-bold text-xs transition-all cursor-pointer ${
                      status === 'nao_iniciado'
                        ? 'bg-slate-700/50 border-slate-400 text-slate-200 ring-2 ring-slate-400/40 shadow-lg'
                        : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span>A Fazer</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    onClick={() => handleMoveToPhase('bloqueado')}
                    className={`flex items-center justify-between p-3 rounded-2xl border font-bold text-xs transition-all cursor-pointer ${
                      status === 'bloqueado'
                        ? 'bg-red-500/20 border-red-500 text-red-300 ring-2 ring-red-500/40 shadow-lg'
                        : 'bg-red-950/20 hover:bg-red-900/30 border-red-500/30 text-red-400'
                    }`}
                  >
                    <span>Bloqueado</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Vínculo de Entregáveis */}
                <div className="mt-4 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileCheck size={14} className="text-emerald-400" /> Pranchas de Projeto
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {task.deliverableIds?.length || 0} prancha(s) vinculada(s)
                  </div>
                  <button
                    onClick={() => onOpenDeliverablesModal?.(task)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition-colors cursor-pointer mt-1"
                  >
                    <Link2 size={13} /> Gerenciar Entregáveis
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ABA 2: CHECKLIST ───────────────────────────────────────────── */}
          {activeTab === 'checklist' && (
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare size={16} className="text-orange-400" /> Checklist da Atividade
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  {checklist.filter(c => c.completed).length} de {checklist.length} concluídos
                </span>
              </div>

              {/* Lista */}
              <div className="space-y-2">
                {checklist.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      item.completed
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-400 line-through'
                        : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {}}
                        className="w-4 h-4 accent-emerald-500 rounded"
                      />
                      <span className="text-xs font-medium">{item.title}</span>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setChecklist(checklist.filter(c => c.id !== item.id))
                      }}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Input Adicionar Item */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={e => setNewChecklistText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()}
                  placeholder="Novo item de verificação..."
                  className="flex-1 text-xs rounded-xl px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-white outline-none focus:border-orange-500"
                />
                <button
                  onClick={handleAddChecklistItem}
                  className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {/* ── ABA 3: COMENTÁRIOS E NOTAS ──────────────────────────────────── */}
          {activeTab === 'comments' && (
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-orange-400" /> Notas & Comunicação Técnica
              </h4>

              {/* Input de Comentário */}
              <div className="flex items-start gap-2 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                <textarea
                  rows={2}
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  placeholder="Escreva uma observação ou atualização sobre esta atividade..."
                  className="flex-1 bg-transparent text-xs text-white outline-none resize-none placeholder-slate-500"
                />
                <button
                  onClick={handleAddComment}
                  className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-md active:scale-95 transition-all"
                  title="Enviar nota"
                >
                  <Send size={14} />
                </button>
              </div>

              {/* Timeline de Comentários */}
              <div className="space-y-3 mt-2">
                {comments.map(c => (
                  <div key={c.id} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-400">{c.author}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{c.createdAt}</span>
                    </div>
                    <div className="text-xs text-slate-200">{c.text}</div>
                  </div>
                ))}

                {comments.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Nenhuma nota registrada nesta atividade.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 3. MODAL DE CRIAÇÃO DE NOVO CAMPO PERSONALIZADO ──────────────── */}
        {showNewFieldModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sm font-bold text-white">Criar Novo Campo</span>
                <button onClick={() => setShowNewFieldModal(false)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome / Rótulo do Campo</label>
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={e => setNewFieldLabel(e.target.value)}
                  placeholder="Ex: Número do Chamado, Parecer..."
                  className="w-full text-xs rounded-xl p-2.5 bg-slate-800 border border-slate-700 text-white outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Campo</label>
                <select
                  value={newFieldType}
                  onChange={e => setNewFieldType(e.target.value as any)}
                  className="w-full text-xs rounded-xl p-2.5 bg-slate-800 border border-slate-700 text-white outline-none"
                >
                  <option value="text">Texto Curto</option>
                  <option value="textarea">Texto Longo / Parágrafo</option>
                  <option value="number">Número</option>
                  <option value="currency">Moeda (R$)</option>
                  <option value="date">Data</option>
                  <option value="checkbox">Caixa de Seleção (Sim/Não)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Onde este campo aparece?</label>
                <select
                  value={newFieldScope}
                  onChange={e => setNewFieldScope(e.target.value as any)}
                  className="w-full text-xs rounded-xl p-2.5 bg-slate-800 border border-slate-700 text-white outline-none"
                >
                  <option value="bucket">Apenas na Fase Atual ({currentStatusCfg.label})</option>
                  <option value="global">Em Todas as Fases (Formulário Padrão)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowNewFieldModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddNewField}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md"
                >
                  Criar Campo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
