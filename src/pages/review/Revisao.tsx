import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileCheck, Plus, MessageSquare,
  CheckCircle, XCircle, AlertTriangle, Layers, Loader2
} from 'lucide-react'
import { Card, Button, IssueCategoryBadge, StatusBadge, DataSourceBadge, DrawingQrCode } from '../../components/ui'
import { MOCK_DRAWINGS } from '../../data/mockData'
import { useReviews } from '../../hooks/useReviews'
import { useDrawings } from '../../hooks/useDrawings'
import { useApp } from '../../context/AppContext'
import type { Issue, IssueCategory } from '../../types'
import { renderPdfPage, type RenderedPdfPage } from '../../lib/pdf-comparison'

const CATEGORY_OPTIONS: { value: IssueCategory; label: string; color: string }[] = [
  { value: 'conflito_projeto',  label: 'Conflito de Projeto',  color: '#EF4444' },
  { value: 'incompletude',      label: 'Incompletude',         color: '#F97316' },
  { value: 'erro_cota',         label: 'Erro de Cota',         color: '#EAB308' },
  { value: 'falta_detalhe',     label: 'Falta de Detalhe',     color: '#3B82F6' },
  { value: 'nomenclatura',      label: 'Nomenclatura',         color: '#8B5CF6' },
  { value: 'compatibilizacao',  label: 'Compatibilização',     color: '#06B6D4' },
  { value: 'outro',             label: 'Outro',                color: '#6B7280' },
]

function IssuePin({ issue, index, selected, onClick }: {
  issue: Issue; index: number; selected: boolean; onClick: () => void
}) {
  const cat = CATEGORY_OPTIONS.find(c => c.value === issue.category)
  const color = cat?.color || '#6B7280'

  return (
    <div
      className="absolute cursor-pointer group"
      style={{ left: `${issue.x}%`, top: `${issue.y}%`, transform: 'translate(-50%, -100%)' }}
      onClick={onClick}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg transition-transform"
        style={{
          background: color,
          transform: selected ? 'scale(1.3)' : 'scale(1)',
          boxShadow: selected ? `0 0 0 3px white, 0 0 0 5px ${color}` : `0 2px 8px ${color}88`,
        }}
      >
        {index + 1}
      </div>
      {/* Tooltip on hover */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-40 p-2 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"
        style={{ background: 'var(--surface-card)', border: `1px solid ${color}`, color: 'var(--white)' }}
      >
        <div className="font-semibold truncate">{issue.title}</div>
        <div className="mt-0.5" style={{ color }}>{cat?.label}</div>
      </div>
    </div>
  )
}

interface CanvasViewProps {
  source: HTMLCanvasElement | null
  className?: string
  style?: React.CSSProperties
}

function CanvasView({ source, className = '', style }: CanvasViewProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !source) return
    canvas.width = source.width
    canvas.height = source.height
    canvas.getContext('2d')?.drawImage(source, 0, 0)
  }, [source])

  if (!source) return null
  return <canvas className={`block ${className}`} ref={ref} style={style} />
}

export default function Revisao() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser, currentProject } = useApp()
  const projectId = currentProject.id  // Load drawings to find the one being reviewed
  const { drawings, loading: drawingsLoading } = useDrawings(projectId)
  const drawing = id ? drawings.find(d => d.id === id) : null

  // Load reviews + issues for this drawing (only call if we have a real drawing)
  const { issues, usingMockData, createIssue, submitDecision } = useReviews(drawing?.id)

  const [selectedIssue, setSelectedIssue] = useState<string | null>(null)
  const [addingIssue, setAddingIssue] = useState(false)
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    category: 'conflito_projeto' as IssueCategory,
    priority: 'alta' as 'alta' | 'media' | 'baixa',
  })
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [decision, setDecision] = useState<'approve' | 'approve_with_notes' | 'reject' | null>(null)
  const [notes, setNotes] = useState('')
  const [showDecisionPanel, setShowDecisionPanel] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // PDF Page loader state
  const [renderedPage, setRenderedPage] = useState<RenderedPdfPage | null>(null)
  const [renderingPdf, setRenderingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  useEffect(() => {
    if (!drawing?.pdfUrl) {
      setRenderedPage(null)
      return
    }
    let cancelled = false
    setRenderingPdf(true)
    setPdfError(null)

    renderPdfPage(drawing.pdfUrl, 1, false)
      .then(page => {
        if (!cancelled) setRenderedPage(page)
      })
      .catch(err => {
        if (!cancelled) {
          console.error('[Revisao] Error rendering drawing PDF:', err)
          setPdfError(err instanceof Error ? err.message : 'Erro ao carregar o PDF da prancha.')
        }
      })
      .finally(() => {
        if (!cancelled) setRenderingPdf(false)
      })

    return () => {
      cancelled = true
    }
  }, [drawing?.pdfUrl])

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!addingIssue) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPendingPos({ x, y })
  }

  async function saveIssue() {
    if (!pendingPos || !newIssue.title || !drawing) return
    await createIssue({
      drawingId: drawing.id,
      x: pendingPos.x,
      y: pendingPos.y,
      pageNumber: 1,
      category: newIssue.category,
      title: newIssue.title,
      description: newIssue.description,
      priority: newIssue.priority,
      createdBy: currentUser.id,
    })
    setNewIssue({ title: '', description: '', category: 'conflito_projeto', priority: 'alta' })
    setPendingPos(null)
    setAddingIssue(false)
  }

  async function handleConfirmDecision() {
    if (!decision || !drawing) return
    setSubmitting(true)
    try {
      await submitDecision({
        drawingId: drawing.id,
        drawingCode: drawing.code,
        revision: drawing.revision,
        reviewerId: currentUser.id,
        reviewerName: currentUser.name,
        decision,
        notes: notes.trim(),
      })
      setShowDecisionPanel(false)
      setDecision(null)
      setNotes('')
      navigate('/projetos')
    } catch (err) {
      console.error('[Revisao] Error confirming decision:', err)
      alert(err instanceof Error ? err.message : 'Falha ao confirmar decisão')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedIssueData = issues.find(i => i.id === selectedIssue)
  const [showQrCode, setShowQrCode] = useState(false)

  // ─── Render Selector Panel if accessed directly without id ──────────────────
  if (!id) {
    const pendingDrawings = drawings.filter(d => d.status === 'em_analise')

    return (
      <div className="space-y-5 h-full flex flex-col">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Central de Revisões</h2>
            <p className="text-xs text-slate-400">
              Selecione uma prancha em análise do projeto <span className="text-white font-semibold">{currentProject.name}</span> para iniciar a revisão
            </p>
          </div>
        </div>

        {drawingsLoading ? (
          <Card className="flex-1 flex items-center justify-center p-8">
            <Loader2 className="animate-spin text-orange-500" size={32} />
          </Card>
        ) : pendingDrawings.length === 0 ? (
          <Card className="flex-1 flex flex-col items-center justify-center p-12 text-center border-dashed">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4">
              <FileCheck size={32} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Nenhuma prancha pendente de revisão</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Todas as pranchas deste projeto estão aprovadas ou revisadas. Suba uma nova prancha ou nova revisão na aba "Projetos" para iniciar.
            </p>
            <Button size="sm" onClick={() => navigate('/projetos')}>
              Ir para Projetos
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pendingDrawings.map(d => (
              <Card
                key={d.id}
                className="p-4 hover:border-orange-500/50 cursor-pointer transition-all flex flex-col gap-3 group relative overflow-hidden"
                onClick={() => navigate(`/projetos/${d.id}/revisao`)}
                style={{ border: '1px solid var(--surface-border)' }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                <div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                    style={{ background: 'var(--surface-mid)', color: 'var(--orange)' }}>
                    {d.disciplineCode}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-2 truncate font-mono">{d.code}</h4>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{d.title}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-[10px] text-slate-500 mt-auto">
                  <span>Pavimento: <span className="text-slate-300 font-semibold">{d.floor}</span></span>
                  <span>Rev: <span className="text-white font-bold">{d.revision}</span></span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <DataSourceBadge usingMockData={usingMockData} />
      {/* Header */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/revisao')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--slate)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileCheck size={16} style={{ color: 'var(--orange)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--white)' }}>Revisão & Aprovação</span>
            {drawing && <StatusBadge status={drawing.status} />}
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--slate)' }}>{drawing?.code}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={addingIssue ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => { setAddingIssue(!addingIssue); setPendingPos(null) }}
          >
            <Plus size={14} />
            {addingIssue ? 'Clique na prancha' : 'Adicionar Issue'}
          </Button>
          {drawing && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setShowQrCode(!showQrCode)}>
                QR Code
              </Button>
              <Button size="sm" onClick={() => setShowDecisionPanel(!showDecisionPanel)}>
                <FileCheck size={14} /> Aprovar / Rejeitar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* QR Code panel */}
      {showQrCode && drawing && (
        <Card className="p-4 flex-shrink-0 flex items-center justify-center gap-6"
          style={{ border: '1px solid rgba(249,115,22,0.3)' }}>
          <DrawingQrCode
            data={drawing.code}
            size={160}
            label={drawing.code}
          />
          <div className="text-xs space-y-1" style={{ color: 'var(--slate)' }}>
            <div className="font-semibold" style={{ color: 'var(--white)' }}>QR Code da Prancha</div>
            <div>Código: <span className="font-mono" style={{ color: 'var(--orange)' }}>{drawing.code}</span></div>
            <div>Revisão: <span className="font-mono" style={{ color: 'var(--white)' }}>{drawing.revision}</span></div>
            <div className="pt-2 text-xs" style={{ color: 'var(--slate)' }}>
              Imprima e cole no carimbo da prancha.<br />Permite verificação rápida em campo.
            </div>
          </div>
        </Card>
      )}

      {/* Decision panel */}
      {showDecisionPanel && drawing && (
        <Card className="p-4 flex-shrink-0" style={{ border: '1px solid rgba(249,115,22,0.3)' }}>
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--white)' }}>
            Decisão de Revisão — {drawing.revision}
          </div>
          <div className="flex gap-3 mb-3">
            {[
              { v: 'approve', label: 'Aprovar', icon: <CheckCircle size={16}/>, color: '#22C55E' },
              { v: 'approve_with_notes', label: 'Aprovar com ressalva', icon: <AlertTriangle size={16}/>, color: '#EAB308' },
              { v: 'reject', label: 'Rejeitar', icon: <XCircle size={16}/>, color: '#EF4444' },
            ].map(opt => (
              <button
                key={opt.v}
                onClick={() => setDecision(opt.v as any)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: decision === opt.v ? `${opt.color}22` : 'var(--surface-mid)',
                  border: `1px solid ${decision === opt.v ? opt.color : 'var(--surface-border)'}`,
                  color: decision === opt.v ? opt.color : 'var(--slate)',
                }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Observações (opcional)..."
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={submitting}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none"
            style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
          />
          <div className="flex gap-2 mt-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowDecisionPanel(false)} disabled={submitting}>Cancelar</Button>
            <Button size="sm" onClick={handleConfirmDecision} disabled={!decision || submitting}>
              {submitting ? 'Confirmando...' : 'Confirmar Decisão'}
            </Button>
          </div>
        </Card>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        {/* PDF canvas with issue pins */}
        <div className="flex-1 flex flex-col gap-2">
          {addingIssue && (
            <div
              className="text-xs text-center py-2 rounded-lg font-semibold"
              style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--orange)', border: '1px solid rgba(249,115,22,0.3)' }}
            >
              🖱 Clique na área da prancha para marcar a issue
            </div>
          )}
          <div
            className="flex-1 relative rounded-xl overflow-auto cursor-crosshair bg-white border flex items-center justify-center p-4"
            style={{
              borderColor: addingIssue ? 'var(--orange)' : 'var(--surface-border)',
              minHeight: '450px',
            }}
            onClick={handleCanvasClick}
          >
            {renderingPdf && (
              <div className="absolute inset-0 bg-[#0d1825]/40 backdrop-blur-xs flex items-center justify-center z-30">
                <Loader2 className="animate-spin text-orange-500" size={32} />
              </div>
            )}

            {renderedPage ? (
              <div
                className="relative"
                style={{
                  width: `${renderedPage.canvas.width}px`,
                  height: `${renderedPage.canvas.height}px`,
                  maxWidth: '100%'
                }}
              >
                {/* Real PDF Canvas */}
                <CanvasView source={renderedPage.canvas} className="w-full h-full" />

                {/* Issue pins mapped on top of real canvas */}
                {issues.map((issue, idx) => (
                  <IssuePin
                    key={issue.id}
                    issue={issue}
                    index={idx}
                    selected={selectedIssue === issue.id}
                    onClick={() => setSelectedIssue(selectedIssue === issue.id ? null : issue.id)}
                  />
                ))}

                {/* Pending position marker */}
                {pendingPos && (
                  <div
                    className="absolute w-5 h-5 rounded-full border-2 border-white animate-pulse"
                    style={{
                      left: `${pendingPos.x}%`,
                      top: `${pendingPos.y}%`,
                      transform: 'translate(-50%,-50%)',
                      background: 'var(--orange)',
                    }}
                  />
                )}
              </div>
            ) : (
              // Fallback simulated floor plan SVG when no PDF is uploaded or failed
              <div className="relative w-full h-full max-w-[600px] aspect-[4/3] flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 400 300" style={{ position: 'absolute', inset: 0 }}>
                  <defs>
                    <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="8" stroke="#bbb" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect x="30" y="30" width="340" height="240" fill="none" stroke="#333" strokeWidth="2.5" />
                  <rect x="40" y="40" width="118" height="118" fill="url(#hatch)" opacity="0.2" />
                  <line x1="160" y1="30" x2="160" y2="200" stroke="#333" strokeWidth="1.5" />
                  <line x1="30" y1="150" x2="160" y2="150" stroke="#333" strokeWidth="1.5" />
                  <line x1="250" y1="30" x2="250" y2="160" stroke="#333" strokeWidth="1.5" />
                  <line x1="160" y1="200" x2="370" y2="200" stroke="#333" strokeWidth="1.5" />
                  <line x1="30" y1="15" x2="370" y2="15" stroke="#333" strokeWidth="0.5" />
                  <text x="200" y="12" textAnchor="middle" fill="#333" fontSize="8">8.50m</text>
                  <text x="90" y="95" textAnchor="middle" fill="#555" fontSize="11" fontWeight="500">SALA</text>
                  <text x="90" y="178" textAnchor="middle" fill="#555" fontSize="11" fontWeight="500">QUARTO 01</text>
                  <text x="205" y="90" textAnchor="middle" fill="#555" fontSize="11" fontWeight="500">COZINHA</text>
                  <text x="310" y="90" textAnchor="middle" fill="#555" fontSize="11" fontWeight="500">VARANDA</text>
                  <text x="265" y="228" textAnchor="middle" fill="#555" fontSize="11" fontWeight="500">QUARTO 02</text>
                  <rect x="30" y="260" width="340" height="30" fill="none" stroke="#333" strokeWidth="0.5" />
                  <text x="40" y="278" fill="#333" fontSize="7">{drawing?.title || 'Planta de Exemplo'}</text>
                  <text x="350" y="278" textAnchor="end" fill="#333" fontSize="8" fontWeight="bold">{drawing?.revision || 'R00'}</text>
                </svg>

                {/* Issue pins mapped on top of SVG */}
                {issues.map((issue, idx) => (
                  <IssuePin
                    key={issue.id}
                    issue={issue}
                    index={idx}
                    selected={selectedIssue === issue.id}
                    onClick={() => setSelectedIssue(selectedIssue === issue.id ? null : issue.id)}
                  />
                ))}

                {/* Pending position marker */}
                {pendingPos && (
                  <div
                    className="absolute w-5 h-5 rounded-full border-2 border-white animate-pulse"
                    style={{
                      left: `${pendingPos.x}%`,
                      top: `${pendingPos.y}%`,
                      transform: 'translate(-50%,-50%)',
                      background: 'var(--orange)',
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel – issues list + form */}
        <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto">
          {/* Add issue form */}
          {(addingIssue && pendingPos) && (
            <Card className="p-3 space-y-2" style={{ border: '1px solid var(--orange)' }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--orange)' }}>
                Nova Issue · {pendingPos.x.toFixed(0)}%, {pendingPos.y.toFixed(0)}%
              </div>
              <input
                type="text"
                placeholder="Título da issue *"
                value={newIssue.title}
                onChange={e => setNewIssue(prev => ({ ...prev, title: e.target.value }))}
                className="w-full text-sm rounded px-2 py-1.5 outline-none"
                style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
              />
              <textarea
                placeholder="Descrição..."
                rows={2}
                value={newIssue.description}
                onChange={e => setNewIssue(prev => ({ ...prev, description: e.target.value }))}
                className="w-full text-sm rounded px-2 py-1.5 outline-none resize-none"
                style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
              />
              <select
                value={newIssue.category}
                onChange={e => setNewIssue(prev => ({ ...prev, category: e.target.value as IssueCategory }))}
                className="w-full text-sm rounded px-2 py-1.5 outline-none"
                style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
              >
                {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <select
                value={newIssue.priority}
                onChange={e => setNewIssue(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full text-sm rounded px-2 py-1.5 outline-none"
                style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
              >
                <option value="alta">Alta prioridade</option>
                <option value="media">Média prioridade</option>
                <option value="baixa">Baixa prioridade</option>
              </select>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setAddingIssue(false); setPendingPos(null) }}>Cancelar</Button>
                <Button size="sm" onClick={saveIssue} disabled={!newIssue.title}>Salvar</Button>
              </div>
            </Card>
          )}

          {/* Issues list */}
          <div>
            <div className="text-xs font-semibold mb-2 flex items-center justify-between">
              <span style={{ color: 'var(--slate)' }}>
                <MessageSquare size={12} className="inline mr-1" />
                {issues.length} Issues
              </span>
              <span className="text-xs" style={{ color: '#EF4444' }}>
                {issues.filter(i => i.status === 'aberto').length} abertas
              </span>
            </div>
            <div className="space-y-2">
              {issues.map((issue, idx) => {
                const cat = CATEGORY_OPTIONS.find(c => c.value === issue.category)
                return (
                  <div
                    key={issue.id}
                    className="rounded-lg p-3 cursor-pointer transition-all"
                    style={{
                      background: selectedIssue === issue.id ? 'var(--navy-mid)' : 'var(--surface-card)',
                      border: `1px solid ${selectedIssue === issue.id ? 'var(--navy-light)' : 'var(--surface-border)'}`,
                    }}
                    onClick={() => setSelectedIssue(selectedIssue === issue.id ? null : issue.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                        style={{ background: cat?.color || '#6B7280', fontSize: '10px' }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate" style={{ color: 'var(--white)' }}>
                          {issue.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <IssueCategoryBadge category={issue.category} />
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              color: issue.status === 'resolvido' ? '#22C55E'
                                : issue.status === 'em_revisao' ? '#EAB308' : '#EF4444',
                              background: issue.status === 'resolvido' ? '#22C55E22'
                                : issue.status === 'em_revisao' ? '#EAB30822' : '#EF444422',
                            }}
                          >
                            {issue.status === 'aberto' ? 'Aberto'
                              : issue.status === 'em_revisao' ? 'Em revisão'
                              : 'Resolvido'}
                          </span>
                        </div>
                        {issue.description && (
                          <div className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--slate)' }}>
                            {issue.description}
                          </div>
                        )}
                        {issue.assignedTo && (
                          <div className="text-xs mt-1" style={{ color: 'var(--slate)' }}>
                            → {issue.assignedTo}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
