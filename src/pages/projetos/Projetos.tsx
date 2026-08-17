import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, Search, Eye, GitCompare, Layers,
  FileCheck, ChevronDown, ChevronRight, QrCode, History, Loader2, AlertCircle, Ruler,
  FileArchive, FileText, CheckCircle2, Trash2, Plus, RefreshCw, Check, AlertTriangle, Sparkles
} from 'lucide-react'
import { Card, PageHeader, StatusBadge, Button, DataSourceBadge, QrCodePlacer } from '../../components/ui'

import { useDrawings } from '../../hooks/useDrawings'
import { useApp } from '../../context/AppContext'
import type { Drawing, ProjectPhase } from '../../types'
import { parseFilenameSmart } from '../../lib/filenameParser'
import { extractPdfsFromZip, isZipFile } from '../../lib/zipExtractor'

function VersionPill({ revision, active }: { revision: string; active?: boolean }) {
  return (
    <span
      className="text-xs font-mono px-1.5 py-0.5 rounded"
      style={{
        background: active ? 'var(--orange)' : 'var(--surface-mid)',
        color: active ? 'white' : 'var(--slate)',
        border: `1px solid ${active ? 'var(--orange-dark)' : 'var(--surface-border)'}`,
      }}
    >
      {revision}
    </span>
  )
}

function DrawingRow({ drawing, onAction }: {
  drawing: Drawing
  onAction: (action: 'compare' | 'overlay' | 'review' | 'view' | 'quantify', id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { disciplines } = useApp()
  const disc = disciplines.find(d => d.code === drawing.disciplineCode)

  return (
    <>
      <tr
        className="border-b hover:bg-white/5 transition-colors cursor-pointer"
        style={{ borderColor: 'var(--surface-border)' }}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 w-6">
          <button className="p-0.5" style={{ color: 'var(--slate)' }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{
                background: `${disc?.color || '#6B7280'}22`,
                color: disc?.color || '#6B7280',
                border: `1px solid ${disc?.color || '#6B7280'}44`,
                minWidth: 38,
                textAlign: 'center',
              }}
            >
              {drawing.disciplineCode}
            </span>
            <div>
              <div className="text-xs font-mono font-semibold" style={{ color: 'var(--white)' }}>
                {drawing.code}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>
                {drawing.title}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs" style={{ color: 'var(--slate)' }}>{drawing.floor}</span>
        </td>
        <td className="px-4 py-3">
          <VersionPill revision={drawing.revision} active />
        </td>
        <td className="px-4 py-3">
          <span className="text-xs" style={{ color: 'var(--slate)' }}>
            {new Date(drawing.sentAt).toLocaleDateString('pt-BR')}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs" style={{ color: 'var(--slate)' }}>{drawing.designerName}</span>
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={drawing.status} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onAction('view', drawing.id)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
              title="Visualizar"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={() => onAction('compare', drawing.id)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
              title="Comparar versões"
            >
              <GitCompare size={14} />
            </button>
            <button
              onClick={() => onAction('overlay', drawing.id)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
              title="Sobrepor projetos"
            >
              <Layers size={14} />
            </button>
            <button
              onClick={() => onAction('review', drawing.id)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
              title="Revisar / Aprovar"
            >
              <FileCheck size={14} />
            </button>
            <button
              onClick={() => onAction('quantify', drawing.id)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
              title="Quantificar desenho"
            >
              <Ruler size={14} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
          <td colSpan={8} className="px-6 pb-4 pt-2">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--slate)' }}>
                <History size={12} className="inline mr-1.5" />
                Histórico de Revisões
              </div>
              <div className="flex flex-wrap gap-2">
                {(drawing.versions || []).map(v => (
                  <div
                    key={v.revision}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      background: 'var(--surface-mid)',
                      border: `1px solid ${v.revision === drawing.revision ? 'var(--orange)' : 'var(--surface-border)'}`,
                    }}
                  >
                    <VersionPill revision={v.revision} active={v.revision === drawing.revision} />
                    <span className="text-xs" style={{ color: 'var(--slate)' }}>
                      {new Date(v.sentAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span className={`text-xs font-semibold ${
                      v.status === 'aprovado' || v.status === 'liberado_para_obra' ? 'text-green-400'
                      : v.status === 'rejeitado' ? 'text-red-400'
                      : 'text-yellow-400'
                    }`}>
                      {v.status === 'liberado_para_obra' ? 'Lib.Obra'
                        : v.status === 'aprovado' ? '✓'
                        : v.status === 'rejeitado' ? '✗'
                        : '…'}
                    </span>
                    {v.revision !== drawing.revision && (
                      <button
                        onClick={() => onAction('compare', drawing.id)}
                        className="text-xs hover:underline ml-1"
                        style={{ color: 'var(--orange)' }}
                      >
                        comparar
                      </button>
                    )}
                  </div>
                ))}
                {(!drawing.versions || drawing.versions.length === 0) && (
                  <span className="text-xs" style={{ color: 'var(--slate)' }}>
                    Apenas esta revisão enviada até o momento.
                  </span>
                )}
              </div>
              {drawing.approvedBy && (
                <div className="text-xs mt-2" style={{ color: 'var(--slate)' }}>
                  Aprovado por <span style={{ color: 'var(--white)' }}>{drawing.approvedBy}</span>
                  {drawing.approvedAt && ` em ${new Date(drawing.approvedAt).toLocaleDateString('pt-BR')}`}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

const PHASE_OPTIONS: { value: ProjectPhase; label: string }[] = [
  { value: 'estudo_preliminar', label: 'Estudo Preliminar' },
  { value: 'anteprojeto', label: 'Anteprojeto' },
  { value: 'projeto_legal', label: 'Projeto Legal' },
  { value: 'projeto_basico', label: 'Projeto Básico' },
  { value: 'pre_executivo', label: 'Pré-Executivo' },
  { value: 'executivo', label: 'Executivo' },
  { value: 'as_built', label: 'As Built' },
]

interface BatchItem {
  id: string
  file: File
  originalName: string
  disciplineCode: string
  floorCode: string
  docType: string
  number: string
  revision: string
  phase: ProjectPhase
  title: string
  generatedCode: string
  isComplete: boolean
  confidence: {
    discipline: boolean
    floor: boolean
    docType: boolean
    revision: boolean
    phase: boolean
    number: boolean
    title: boolean
  }
  status: 'pending' | 'uploading' | 'success' | 'error'
  errorMessage?: string
}

function UploadPanel({ projectId, onClose, onUploaded }: {
  projectId: string
  onClose: () => void
  onUploaded: () => void
}) {
  const { upload } = useDrawings(projectId)
  const {
    currentUser,
    currentProject,
    disciplines,
    floors,
    phases,
    docTypes,
    namingSequence,
    namingSeparator
  } = useApp()

  const [items, setItems] = useState<BatchItem[]>([])
  const [isProcessingZip, setIsProcessingZip] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [uploadedDrawing, setUploadedDrawing] = useState<Drawing | null>(null)

  // Batch action bulk values
  const [bulkDisc, setBulkDisc] = useState('')
  const [bulkFloor, setBulkFloor] = useState('')
  const [bulkPhase, setBulkPhase] = useState<ProjectPhase | ''>('')

  // Compute code for a single item
  const computeCode = (item: {
    disciplineCode: string
    floorCode: string
    docType: string
    number: string
    revision: string
    phase: ProjectPhase
  }) => {
    const phaseCodeMap: Record<ProjectPhase, string> = {
      estudo_preliminar: 'EP',
      anteprojeto: 'AP',
      projeto_legal: 'PL',
      projeto_basico: 'PB',
      pre_executivo: 'PE',
      executivo: 'EX',
      liberado_para_obra: 'LO',
      as_built: 'ASB',
    }
    const values: Record<string, string> = {
      PROJETO: currentProject.code,
      FASE: phaseCodeMap[item.phase] || 'EX',
      DISCIPLINA: item.disciplineCode,
      PAVIMENTO: item.floorCode,
      TIPO: item.docType,
      NUMERO: item.number,
      REVISAO: item.revision,
    }
    if (!item.disciplineCode || !item.floorCode) return ''
    return namingSequence
      .map(key => values[key] || '')
      .filter(Boolean)
      .join(namingSeparator)
  }

  // Process incoming files (PDFs and ZIP archives)
  const handleFilesSelected = async (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return
    setError(null)
    setSuccessMsg(null)

    const rawFiles = Array.from(fileList)
    const pdfFiles: File[] = []

    try {
      const hasZip = rawFiles.some(f => isZipFile(f))
      if (hasZip) {
        setIsProcessingZip(true)
      }

      for (const file of rawFiles) {
        if (isZipFile(file)) {
          const extracted = await extractPdfsFromZip(file)
          pdfFiles.push(...extracted)
        } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          pdfFiles.push(file)
        }
      }

      if (pdfFiles.length === 0) {
        setError('Nenhum arquivo PDF válido encontrado na seleção ou no arquivo ZIP.')
        setIsProcessingZip(false)
        return
      }

      const newBatchItems: BatchItem[] = pdfFiles.map((file, idx) => {
        const parsed = parseFilenameSmart(file.name, {
          disciplines,
          floors,
          phases,
          docTypes,
          namingSequence,
          namingSeparator,
          projectCode: currentProject.code,
        })

        const disc = parsed.disciplineCode || (disciplines[0]?.code || 'ARQ')
        const floor = parsed.floorCode || (floors[0]?.code || 'TER')
        const type = parsed.docType || (docTypes[0] || 'PLA')
        const num = parsed.number || String(idx + 1).padStart(3, '0')
        const rev = parsed.revision || 'R00'
        const phaseVal = parsed.phase || 'executivo'
        const titleVal = parsed.title || file.name.replace(/\.[^/.]+$/, '')

        const code = computeCode({
          disciplineCode: disc,
          floorCode: floor,
          docType: type,
          number: num,
          revision: rev,
          phase: phaseVal,
        })

        return {
          id: `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          originalName: file.name,
          disciplineCode: disc,
          floorCode: floor,
          docType: type,
          number: num,
          revision: rev,
          phase: phaseVal,
          title: titleVal,
          generatedCode: code,
          isComplete: Boolean(disc && floor && titleVal),
          confidence: parsed.confidence,
          status: 'pending',
        }
      })

      setItems(prev => [...prev, ...newBatchItems])
    } catch (err) {
      console.error('[UploadPanel] Erro ao processar arquivos:', err)
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivos selecionados.')
    } finally {
      setIsProcessingZip(false)
    }
  }

  // Update specific item in batch
  const updateItem = (id: string, updates: Partial<BatchItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, ...updates }
      const newCode = computeCode({
        disciplineCode: updated.disciplineCode,
        floorCode: updated.floorCode,
        docType: updated.docType,
        number: updated.number,
        revision: updated.revision,
        phase: updated.phase,
      })
      return {
        ...updated,
        generatedCode: newCode,
        isComplete: Boolean(updated.disciplineCode && updated.floorCode && updated.title),
      }
    }))
  }

  // Remove item from batch
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  // Bulk apply
  const applyBulkDiscipline = () => {
    if (!bulkDisc) return
    setItems(prev => prev.map(i => {
      const updated = { ...i, disciplineCode: bulkDisc }
      return {
        ...updated,
        generatedCode: computeCode(updated),
        isComplete: Boolean(updated.disciplineCode && updated.floorCode && updated.title),
      }
    }))
  }

  const applyBulkFloor = () => {
    if (!bulkFloor) return
    setItems(prev => prev.map(i => {
      const updated = { ...i, floorCode: bulkFloor }
      return {
        ...updated,
        generatedCode: computeCode(updated),
        isComplete: Boolean(updated.disciplineCode && updated.floorCode && updated.title),
      }
    }))
  }

  const applyBulkPhase = () => {
    if (!bulkPhase) return
    setItems(prev => prev.map(i => {
      const updated = { ...i, phase: bulkPhase }
      return {
        ...updated,
        generatedCode: computeCode(updated),
        isComplete: Boolean(updated.disciplineCode && updated.floorCode && updated.title),
      }
    }))
  }

  // Submit all items
  const handleSubmitAll = async () => {
    if (items.length === 0) return
    const incomplete = items.some(i => !i.disciplineCode || !i.floorCode || !i.title)
    if (incomplete) {
      setError('Algumas pranchas estão com dados incompletos. Preencha disciplina, pavimento e título antes de enviar.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccessMsg(null)

    let successCount = 0
    let lastUploaded: Drawing | null = null

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.status === 'success') {
        successCount++
        continue
      }

      setUploadProgress({ current: i + 1, total: items.length })
      updateItem(item.id, { status: 'uploading' })

      try {
        const newDrawing = await upload({
          projectId,
          file: item.file,
          code: item.generatedCode,
          disciplineCode: item.disciplineCode,
          floorCode: item.floorCode,
          docType: item.docType,
          number: item.number,
          revision: item.revision,
          phase: item.phase,
          title: item.title,
          designerName: currentUser.name,
          designerId: currentUser.id,
        })
        lastUploaded = newDrawing
        successCount++
        updateItem(item.id, { status: 'success' })
      } catch (err) {
        console.error(`[UploadPanel] Erro ao enviar prancha ${item.originalName}:`, err)
        updateItem(item.id, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Falha no envio'
        })
      }
    }

    setSubmitting(false)
    setUploadProgress(null)

    if (successCount === items.length) {
      setSuccessMsg(`✓ Todas as ${successCount} pranchas foram enviadas com sucesso!`)
      if (items.length === 1 && lastUploaded) {
        setUploadedDrawing(lastUploaded)
      } else {
        setTimeout(() => {
          onUploaded()
          onClose()
        }, 1500)
      }
    } else {
      setError(`${successCount} de ${items.length} pranchas enviadas. Algumas apresentaram erro.`)
      onUploaded()
    }
  }

  const readyCount = items.filter(i => i.isComplete).length
  const attentionCount = items.length - readyCount

  return (
    <>
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-orange-400" />
            <span className="text-sm font-semibold text-white">
              Importação de Pranchas (PDFs & ZIP)
            </span>
          </div>
          {items.length > 0 && (
            <button
              onClick={() => setItems([])}
              disabled={submitting}
              className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} />
              Limpar fila
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs p-3 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="text-xs p-3 rounded-lg"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}>
            {successMsg}
          </div>
        )}

        {/* Drag & Drop Area */}
        <label
          className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-orange-400/50 transition-colors"
          style={{
            borderColor: items.length > 0 ? 'var(--orange)' : 'var(--surface-border)',
            background: 'var(--surface-mid)'
          }}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.zip,application/pdf,application/zip,application/x-zip-compressed"
            className="hidden"
            disabled={submitting || isProcessingZip}
            onChange={e => handleFilesSelected(e.target.files)}
          />
          {isProcessingZip ? (
            <div className="py-2">
              <Loader2 size={28} className="mx-auto mb-2 text-orange-400 animate-spin" />
              <div className="text-sm font-medium text-white">Descompactando arquivo ZIP e analisando PDFs...</div>
              <div className="text-xs text-slate-400 mt-1">Extraindo pranchas e aplicando motor de reconhecimento</div>
            </div>
          ) : (
            <>
              <div className="flex justify-center items-center gap-3 mb-2 text-orange-400">
                <FileText size={24} />
                <Plus size={14} className="text-slate-500" />
                <FileArchive size={24} />
              </div>
              <div className="text-sm font-medium text-white mb-1">
                {items.length > 0
                  ? 'Arraste mais PDFs ou outro arquivo .ZIP para adicionar à fila'
                  : 'Arraste PDFs ou um arquivo .ZIP aqui (ou clique para selecionar múltiplos)'}
              </div>
              <div className="text-xs text-slate-400">
                O motor inteligente identificará automaticamente Disciplina, Pavimento, Fase, Tipo, Revisão e Título
              </div>
            </>
          )}
        </label>

        {/* Staging / Review Area */}
        {items.length > 0 && (
          <div className="space-y-3">
            {/* Batch summary & quick actions bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {items.length} {items.length === 1 ? 'prancha' : 'pranchas'}
                </span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={13} /> {readyCount} prontos
                </span>
                {attentionCount > 0 && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={13} /> {attentionCount} requer atenção
                  </span>
                )}
              </div>

              {/* Bulk actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-medium">Aplicar a todos:</span>
                
                {/* Bulk Disc */}
                <div className="flex items-center gap-1">
                  <select
                    value={bulkDisc}
                    onChange={e => setBulkDisc(e.target.value)}
                    className="text-xs rounded px-2 py-1 outline-none bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">Disciplina...</option>
                    {disciplines.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
                  </select>
                  <button
                    onClick={applyBulkDiscipline}
                    disabled={!bulkDisc}
                    className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300"
                    title="Aplicar disciplina a todos"
                  >
                    <Check size={12} />
                  </button>
                </div>

                {/* Bulk Floor */}
                <div className="flex items-center gap-1">
                  <select
                    value={bulkFloor}
                    onChange={e => setBulkFloor(e.target.value)}
                    className="text-xs rounded px-2 py-1 outline-none bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">Pavimento...</option>
                    {floors.map(f => <option key={f.code} value={f.code}>{f.code}</option>)}
                  </select>
                  <button
                    onClick={applyBulkFloor}
                    disabled={!bulkFloor}
                    className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300"
                    title="Aplicar pavimento a todos"
                  >
                    <Check size={12} />
                  </button>
                </div>

                {/* Bulk Phase */}
                <div className="flex items-center gap-1">
                  <select
                    value={bulkPhase}
                    onChange={e => setBulkPhase(e.target.value as ProjectPhase)}
                    className="text-xs rounded px-2 py-1 outline-none bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">Fase...</option>
                    {phases.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button
                    onClick={applyBulkPhase}
                    disabled={!bulkPhase}
                    className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300"
                    title="Aplicar fase a todos"
                  >
                    <Check size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Staging Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[360px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
                  <tr className="text-slate-400">
                    <th className="px-3 py-2 w-8">Status</th>
                    <th className="px-3 py-2 min-w-[140px]">Arquivo</th>
                    <th className="px-3 py-2 w-28">Disciplina</th>
                    <th className="px-3 py-2 w-28">Pavimento</th>
                    <th className="px-3 py-2 w-20">Tipo</th>
                    <th className="px-3 py-2 w-16">Nº</th>
                    <th className="px-3 py-2 w-20">Rev</th>
                    <th className="px-3 py-2 w-28">Fase</th>
                    <th className="px-3 py-2 min-w-[180px]">Título</th>
                    <th className="px-3 py-2 min-w-[160px]">Código Gerado</th>
                    <th className="px-3 py-2 w-10 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                  {items.map(item => (
                    <tr
                      key={item.id}
                      className="hover:bg-white/5 transition-colors"
                      style={{
                        background: item.status === 'error' ? 'rgba(239,68,68,0.05)'
                          : item.status === 'success' ? 'rgba(34,197,94,0.05)'
                          : undefined
                      }}
                    >
                      {/* Status */}
                      <td className="px-3 py-2">
                        {item.status === 'uploading' ? (
                          <Loader2 size={14} className="animate-spin text-orange-400" />
                        ) : item.status === 'success' ? (
                          <CheckCircle2 size={14} className="text-emerald-400" />
                        ) : item.status === 'error' ? (
                          <span title={item.errorMessage}>
                            <AlertCircle size={14} className="text-red-400" />
                          </span>
                        ) : item.isComplete ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Pronto para envio" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Verifique os campos" />
                        )}
                      </td>

                      {/* Filename */}
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-300 truncate max-w-[160px]" title={item.originalName}>
                        {item.originalName}
                      </td>

                      {/* Disciplina */}
                      <td className="px-3 py-2">
                        <select
                          value={item.disciplineCode}
                          disabled={submitting || item.status === 'success'}
                          onChange={e => updateItem(item.id, { disciplineCode: e.target.value })}
                          className="w-full text-xs rounded px-1.5 py-1 outline-none bg-slate-800 border border-slate-700 text-white"
                        >
                          {disciplines.map(d => <option key={d.code} value={d.code}>{d.code} – {d.name}</option>)}
                        </select>
                      </td>

                      {/* Pavimento */}
                      <td className="px-3 py-2">
                        <select
                          value={item.floorCode}
                          disabled={submitting || item.status === 'success'}
                          onChange={e => updateItem(item.id, { floorCode: e.target.value })}
                          className="w-full text-xs rounded px-1.5 py-1 outline-none bg-slate-800 border border-slate-700 text-white"
                        >
                          {floors.map(f => <option key={f.code} value={f.code}>{f.code} – {f.name}</option>)}
                        </select>
                      </td>

                      {/* Tipo */}
                      <td className="px-3 py-2">
                        <select
                          value={item.docType}
                          disabled={submitting || item.status === 'success'}
                          onChange={e => updateItem(item.id, { docType: e.target.value })}
                          className="w-full text-xs rounded px-1.5 py-1 outline-none bg-slate-800 border border-slate-700 text-white font-mono"
                        >
                          {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>

                      {/* Número */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.number}
                          disabled={submitting || item.status === 'success'}
                          onChange={e => updateItem(item.id, { number: e.target.value })}
                          className="w-full text-xs rounded px-1.5 py-1 outline-none bg-slate-800 border border-slate-700 text-white font-mono text-center"
                        />
                      </td>

                      {/* Revisão */}
                      <td className="px-3 py-2">
                        <select
                          value={item.revision}
                          disabled={submitting || item.status === 'success'}
                          onChange={e => updateItem(item.id, { revision: e.target.value })}
                          className="w-full text-xs rounded px-1.5 py-1 outline-none bg-slate-800 border border-slate-700 text-white font-mono"
                        >
                          {['R00','R01','R02','R03','R04','R05','R06','R07'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>

                      {/* Fase */}
                      <td className="px-3 py-2">
                        <select
                          value={item.phase}
                          disabled={submitting || item.status === 'success'}
                          onChange={e => updateItem(item.id, { phase: e.target.value as ProjectPhase })}
                          className="w-full text-xs rounded px-1.5 py-1 outline-none bg-slate-800 border border-slate-700 text-white"
                        >
                          {phases.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </td>

                      {/* Título */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.title}
                          disabled={submitting || item.status === 'success'}
                          onChange={e => updateItem(item.id, { title: e.target.value })}
                          className="w-full text-xs rounded px-2 py-1 outline-none bg-slate-800 border border-slate-700 text-white"
                          placeholder="Título da prancha..."
                        />
                      </td>

                      {/* Código Oficial */}
                      <td className="px-3 py-2 font-mono text-[11px] text-orange-400 font-bold">
                        {item.generatedCode || '—'}
                      </td>

                      {/* Ações */}
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={submitting || item.status === 'success'}
                          className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors"
                          title="Remover da fila"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploadProgress && (
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Enviando prancha {uploadProgress.current} de {uploadProgress.total}...</span>
              <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-2 pt-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Fechar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmitAll}
            disabled={submitting || items.length === 0 || isProcessingZip}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {submitting
              ? 'Enviando Pranchas...'
              : `Importar ${items.length > 0 ? `${items.length} ${items.length === 1 ? 'Prancha' : 'Pranchas'}` : 'Pranchas'}`}
          </Button>
        </div>
      </Card>

      {uploadedDrawing && (
        <QrCodePlacer
          drawing={uploadedDrawing}
          onSaved={() => {
            onUploaded()
            onClose()
          }}
          onClose={() => {
            onUploaded()
            onClose()
          }}
        />
      )}
    </>
  )
}

export default function Projetos() {
  const navigate = useNavigate()
  const { currentProject, disciplines } = useApp()
  const projectId = currentProject.id

  const { drawings, loading, error, usingMockData, refresh } = useDrawings(projectId)

  const [search, setSearch] = useState('')
  const [filterDisc, setFilterDisc] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterFloor, setFilterFloor] = useState('todos')
  const [showUpload, setShowUpload] = useState(false)

  const floors = [...new Set(drawings.map(d => d.floor))].sort()

  const filtered = drawings.filter(d => {
    const q = search.toLowerCase()
    if (q && !d.code.toLowerCase().includes(q) && !d.title.toLowerCase().includes(q) && !d.designerName.toLowerCase().includes(q)) return false
    if (filterDisc !== 'todos' && d.disciplineCode !== filterDisc) return false
    if (filterStatus !== 'todos' && d.status !== filterStatus) return false
    if (filterFloor !== 'todos' && d.floor !== filterFloor) return false
    return true
  })

  function handleAction(action: 'compare' | 'overlay' | 'review' | 'view' | 'quantify', id: string) {
    if (action === 'compare') navigate(`/projetos/${id}/comparar`)
    if (action === 'overlay') navigate(`/projetos/${id}/sobrepor`)
    if (action === 'review') navigate(`/projetos/${id}/revisao`)
    if (action === 'view') navigate(`/projetos/${id}/visualizar`)
    if (action === 'quantify') navigate(`/projetos/${id}/quantificacao`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projetos"
        subtitle={`${filtered.length} pranchas · ${currentProject.name}`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => {}}>
              <QrCode size={14} /> QR Code
            </Button>
            <Button size="sm" onClick={() => setShowUpload(!showUpload)}>
              <Upload size={14} /> Upload Prancha
            </Button>
          </>
        }
      />

      <DataSourceBadge usingMockData={usingMockData} />

      {error && !usingMockData && (
        <div className="flex items-center gap-2 text-xs p-3 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Upload panel */}
      {showUpload && (
        <UploadPanel
          projectId={projectId}
          onClose={() => setShowUpload(false)}
          onUploaded={refresh}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate)' }} />
          <input
            type="text"
            placeholder="Buscar por código, título, projetista..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm rounded-lg outline-none"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
        </div>
        {[
          { value: filterDisc, setter: setFilterDisc, label: 'Disciplina', options: disciplines.map(d => ({ v: d.code, l: `${d.code} – ${d.name}` })) },
          { value: filterStatus, setter: setFilterStatus, label: 'Status', options: [
            { v: 'em_analise', l: 'Em Análise' },
            { v: 'aprovado', l: 'Aprovado' },
            { v: 'liberado_para_obra', l: 'Lib. Obra' },
            { v: 'rejeitado', l: 'Rejeitado' },
          ]},
          { value: filterFloor, setter: setFilterFloor, label: 'Pavimento', options: floors.map(f => ({ v: f, l: f })) },
        ].map(f => (
          <select
            key={f.label}
            value={f.value}
            onChange={e => f.setter(e.target.value)}
            className="text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          >
            <option value="todos">Todos: {f.label}</option>
            {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: 'var(--slate)' }}>
            <Loader2 size={16} className="animate-spin" /> Carregando pranchas...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--surface-border)' }}>
                  <th className="px-4 py-3 w-6" />
                  {['Código / Título','Pav.','Revisão','Data Envio','Projetista','Status','Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--slate)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <DrawingRow key={d.id} drawing={d} onAction={handleAction} />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm" style={{ color: 'var(--slate)' }}>
                      Nenhuma prancha encontrada com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
