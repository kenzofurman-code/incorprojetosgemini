import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileCheck, Plus, MessageSquare,
  CheckCircle, XCircle, AlertTriangle, Layers, Loader2,
  ZoomIn, ZoomOut, Square, Edit3, MapPin
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

// Parse serialized markup from description
interface ParsedMarkup {
  type: 'pin' | 'rect' | 'scribble'
  x: number
  y: number
  w?: number
  h?: number
  points?: { x: number; y: number }[]
  realDescription: string
}

function parseIssueDescription(desc: string): ParsedMarkup {
  try {
    const data = JSON.parse(desc)
    if (data && (data.type === 'rect' || data.type === 'scribble' || data.type === 'pin')) {
      return data
    }
  } catch {}
  return {
    type: 'pin',
    x: 0,
    y: 0,
    realDescription: desc,
  }
}

function IssuePin({ issue, index, selected, onClick }: {
  issue: Issue; index: number; selected: boolean; onClick: () => void
}) {
  const cat = CATEGORY_OPTIONS.find(c => c.value === issue.category)
  const color = cat?.color || '#6B7280'
  const markup = parseIssueDescription(issue.description)

  // Pins are located at issue x and y coordinates
  const posX = markup.type === 'pin' ? issue.x : markup.x
  const posY = markup.type === 'pin' ? issue.y : markup.y

  return (
    <div
      className="absolute cursor-pointer group z-20"
      style={{
        left: `${posX}%`,
        top: `${posY}%`,
        transform: 'translate(-50%, -100%)',
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
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
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-40 p-2 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30"
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

export default function Revisao({ viewOnly = false }: { viewOnly?: boolean }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser, currentProject } = useApp()
  const projectId = currentProject.id
  const { drawings, loading: drawingsLoading } = useDrawings(projectId)
  const drawing = id ? drawings.find(d => d.id === id) : null

  // Load reviews + issues for this drawing (only call if we have a real drawing)
  const { issues, usingMockData, createIssue, submitDecision } = useReviews(drawing?.id)

  const [selectedIssue, setSelectedIssue] = useState<string | null>(null)
  const [addingIssue, setAddingIssue] = useState(false)
  const [markupTool, setMarkupTool] = useState<'pin' | 'rect' | 'scribble'>('pin')

  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    category: 'conflito_projeto' as IssueCategory,
    priority: 'alta' as 'alta' | 'media' | 'baixa',
  })

  // Review states
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

  const dimensions = renderedPage
    ? { width: renderedPage.canvas.width, height: renderedPage.canvas.height }
    : { width: 800, height: 600 }

  // ─── Zoom & Pan State ──────────────────────────────────────────────────────
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [spacePressed, setSpacePressed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Catch Spacebar key listeners for panning shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setSpacePressed(true)
        e.preventDefault()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Prevent browser window zoom on Ctrl + Wheel
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleWheelPrevent = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    container.addEventListener('wheel', handleWheelPrevent, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheelPrevent)
    }
  }, [])

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const zoomFactor = 1.15
      const nextScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor
      const clampedScale = Math.min(Math.max(nextScale, 0.25), 8)

      // Zoom towards mouse position
      const rect = e.currentTarget.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const dx = mouseX - offset.x
      const dy = mouseY - offset.y

      setOffset({
        x: mouseX - dx * (clampedScale / scale),
        y: mouseY - dy * (clampedScale / scale),
      })
      setScale(clampedScale)
    }
  }

  // ─── Drawing / Markup States & Events ──────────────────────────────────────
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([])
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null)
  const [boxCurrent, setBoxCurrent] = useState<{ x: number; y: number } | null>(null)
  const [pendingMarkup, setPendingMarkup] = useState<any | null>(null)

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const isMiddleButton = e.button === 1
    const isRightButton = e.button === 2
    const canPan = !addingIssue || spacePressed || isMiddleButton || isRightButton

    if (canPan) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      e.preventDefault()
      return
    }

    if (addingIssue) {
      const rect = e.currentTarget.getBoundingClientRect()
      // Map screen clicks relative to transformed canvas
      const xOnViewport = e.clientX - rect.left
      const yOnViewport = e.clientY - rect.top

      // Apply zoom & pan transformations in reverse to get percentage coordinates (0-100)
      const xInCanvasPixels = (xOnViewport - offset.x) / scale
      const yInCanvasPixels = (yOnViewport - offset.y) / scale
      const xPct = (xInCanvasPixels / dimensions.width) * 100
      const yPct = (yInCanvasPixels / dimensions.height) * 100

      if (markupTool === 'pin') {
        setPendingMarkup({
          type: 'pin',
          x: xPct,
          y: yPct,
        })
      } else if (markupTool === 'rect') {
        setBoxStart({ x: xPct, y: yPct })
        setBoxCurrent({ x: xPct, y: yPct })
      } else if (markupTool === 'scribble') {
        setDrawingPoints([{ x: xPct, y: yPct }])
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
      return
    }

    if (addingIssue) {
      const rect = e.currentTarget.getBoundingClientRect()
      const xOnViewport = e.clientX - rect.left
      const yOnViewport = e.clientY - rect.top
      const xInCanvasPixels = (xOnViewport - offset.x) / scale
      const yInCanvasPixels = (yOnViewport - offset.y) / scale
      const xPct = (xInCanvasPixels / dimensions.width) * 100
      const yPct = (yInCanvasPixels / dimensions.height) * 100

      if (markupTool === 'rect' && boxStart) {
        setBoxCurrent({ x: xPct, y: yPct })
      } else if (markupTool === 'scribble' && drawingPoints.length > 0) {
        setDrawingPoints(prev => [...prev, { x: xPct, y: yPct }])
      }
    }
  }

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (addingIssue) {
      if (markupTool === 'rect' && boxStart && boxCurrent) {
        const x = Math.min(boxStart.x, boxCurrent.x)
        const y = Math.min(boxStart.y, boxCurrent.y)
        const w = Math.abs(boxStart.x - boxCurrent.x)
        const h = Math.abs(boxStart.y - boxCurrent.y)
        if (w > 0.5 && h > 0.5) {
          setPendingMarkup({
            type: 'rect',
            x,
            y,
            w,
            h,
          })
        }
        setBoxStart(null)
        setBoxCurrent(null)
      } else if (markupTool === 'scribble' && drawingPoints.length > 1) {
        setPendingMarkup({
          type: 'scribble',
          x: drawingPoints[0].x,
          y: drawingPoints[0].y,
          points: drawingPoints,
        })
        setDrawingPoints([])
      }
    }
  }

  async function saveIssue() {
    if (!pendingMarkup || !newIssue.title || !drawing) return

    // Serialize markup geometry inside the description field
    const serializedDescription = JSON.stringify({
      type: pendingMarkup.type,
      x: pendingMarkup.x,
      y: pendingMarkup.y,
      w: pendingMarkup.w,
      h: pendingMarkup.h,
      points: pendingMarkup.points,
      realDescription: newIssue.description,
    })

    await createIssue({
      drawingId: drawing.id,
      x: pendingMarkup.x,
      y: pendingMarkup.y,
      pageNumber: 1,
      category: newIssue.category,
      title: newIssue.title,
      description: serializedDescription,
      priority: newIssue.priority,
      createdBy: currentUser.id,
    })

    setNewIssue({ title: '', description: '', category: 'conflito_projeto', priority: 'alta' })
    setPendingMarkup(null)
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

  const cursorStyle = spacePressed || isPanning ? 'grabbing' : addingIssue ? 'crosshair' : 'grab'

  return (
    <div className="h-full flex flex-col space-y-4">
      <DataSourceBadge usingMockData={usingMockData} />
      {/* Header */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate(viewOnly ? '/projetos' : '/revisao')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--slate)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileCheck size={16} style={{ color: 'var(--orange)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
              {viewOnly ? 'Visualização da Prancha' : 'Revisão & Aprovação'}
            </span>
            {drawing && <StatusBadge status={drawing.status} />}
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--slate)' }}>{drawing?.code}</div>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-surface-mid rounded-lg p-1 border border-surface-border mr-2">
            <button
              onClick={() => setScale(s => Math.max(s / 1.3, 0.25))}
              className="p-1 hover:bg-white/10 rounded"
              title="Zoom Out"
              style={{ color: 'var(--slate)' }}
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[10px] font-mono px-1 w-12 text-center" style={{ color: 'var(--white)' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(s * 1.3, 8))}
              className="p-1 hover:bg-white/10 rounded"
              title="Zoom In"
              style={{ color: 'var(--slate)' }}
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}
              className="p-1 hover:bg-white/10 rounded text-[9px] font-semibold"
              style={{ color: 'var(--slate)' }}
            >
              1:1
            </button>
          </div>

          {!viewOnly && (
            <Button
              variant={addingIssue ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => { setAddingIssue(!addingIssue); setPendingMarkup(null) }}
            >
              <Plus size={14} />
              {addingIssue ? 'Cancelar Anotação' : 'Anotar Desenho'}
            </Button>
          )}
          {drawing && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setShowQrCode(!showQrCode)}>
                QR Code
              </Button>
              {!viewOnly && (
                <Button size="sm" onClick={() => setShowDecisionPanel(!showDecisionPanel)}>
                  <FileCheck size={14} /> Aprovar / Rejeitar
                </Button>
              )}
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

      {/* Adding issue toolbar instructions */}
      {addingIssue && (
        <Card className="p-2 flex items-center justify-between bg-orange-500/10 border-orange-500/30 flex-shrink-0">
          <div className="text-xs font-semibold text-orange-400 flex items-center gap-2">
            <Edit3 size={14} /> Modo Marcação Ativo: Escolha uma ferramenta à direita e clique/desenhe na prancha.
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { type: 'pin', label: 'Ponto', icon: <MapPin size={12} /> },
              { type: 'rect', label: 'Caixa Vermelha', icon: <Square size={12} /> },
              { type: 'scribble', label: 'Desenho à Mão', icon: <Edit3 size={12} /> }
            ].map(tool => (
              <button
                key={tool.type}
                onClick={() => { setMarkupTool(tool.type as any); setPendingMarkup(null) }}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors"
                style={{
                  background: markupTool === tool.type ? 'var(--orange)' : 'var(--surface-mid)',
                  color: 'white',
                }}
              >
                {tool.icon}
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        {/* PDF canvas with issues wrapper */}
        <div className="flex-1 flex flex-col gap-2 relative">
          <div
            ref={containerRef}
            className="flex-1 relative rounded-xl overflow-hidden bg-[#0d1825] border select-none"
            style={{
              borderColor: addingIssue ? 'var(--orange)' : 'var(--surface-border)',
              minHeight: '450px',
              cursor: cursorStyle,
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={e => e.preventDefault()} // prevent right-click menu during panning
          >
            {renderingPdf && (
              <div className="absolute inset-0 bg-[#0d1825]/40 backdrop-blur-xs flex items-center justify-center z-30">
                <Loader2 className="animate-spin text-orange-500" size={32} />
              </div>
            )}

            {/* Transform Matrix Wrapper for Zoom & Pan */}
            <div
              className="absolute origin-top-left"
              style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transition: isPanning ? 'none' : 'transform 0.08s ease-out',
                pointerEvents: 'none', // mouse events handled by parent container
              }}
            >
              {renderedPage ? (
                <>
                  {/* Real PDF Canvas */}
                  <CanvasView source={renderedPage.canvas} className="w-full h-full shadow-2xl animate-fade-in" />

                  {/* SVG Vector Overlays for Box/Scribble Markups (Layered on top of canvas) */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {/* Render saved markups from issues database */}
                    {issues.map(issue => {
                      const markup = parseIssueDescription(issue.description)
                      const cat = CATEGORY_OPTIONS.find(c => c.value === issue.category)
                      const color = cat?.color || '#EF4444'

                      if (markup.type === 'rect' && markup.w && markup.h) {
                        return (
                          <rect
                            key={issue.id}
                            x={`${markup.x}%`}
                            y={`${markup.y}%`}
                            width={`${markup.w}%`}
                            height={`${markup.h}%`}
                            fill="none"
                            stroke={color}
                            strokeWidth="3.5"
                            strokeDasharray="4 2"
                          />
                        )
                      }
                      if (markup.type === 'scribble' && markup.points) {
                        const pathData = markup.points.map((p, i) =>
                          `${i === 0 ? 'M' : 'L'} ${(p.x / 100) * dimensions.width} ${(p.y / 100) * dimensions.height}`
                        ).join(' ')
                        return (
                          <path
                            key={issue.id}
                            d={pathData}
                            fill="none"
                            stroke={color}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )
                      }
                      return null
                    })}

                    {/* Render active drawing previews */}
                    {addingIssue && markupTool === 'rect' && boxStart && boxCurrent && (
                      <rect
                        x={`${Math.min(boxStart.x, boxCurrent.x)}%`}
                        y={`${Math.min(boxStart.y, boxCurrent.y)}%`}
                        width={`${Math.abs(boxStart.x - boxCurrent.x)}%`}
                        height={`${Math.abs(boxStart.y - boxCurrent.y)}%`}
                        fill="rgba(239, 68, 68, 0.15)"
                        stroke="#EF4444"
                        strokeWidth="3"
                        strokeDasharray="4 2"
                      />
                    )}

                    {addingIssue && markupTool === 'scribble' && drawingPoints.length > 1 && (
                      <path
                        d={drawingPoints.map((p, i) =>
                          `${i === 0 ? 'M' : 'L'} ${(p.x / 100) * dimensions.width} ${(p.y / 100) * dimensions.height}`
                        ).join(' ')}
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>

                  {/* HTML Pin Overlay Wrapper */}
                  <div className="absolute inset-0 pointer-events-none z-20">
                    {/* Render saved issue pins */}
                    {issues.map((issue, idx) => (
                      <IssuePin
                        key={issue.id}
                        issue={issue}
                        index={idx}
                        selected={selectedIssue === issue.id}
                        onClick={() => setSelectedIssue(selectedIssue === issue.id ? null : issue.id)}
                      />
                    ))}

                    {/* Render active pending markup pin indicator */}
                    {addingIssue && pendingMarkup && pendingMarkup.type === 'pin' && (
                      <div
                        className="absolute w-5.5 h-5.5 rounded-full border-2 border-white animate-pulse z-30"
                        style={{
                          left: `${pendingMarkup.x}%`,
                          top: `${pendingMarkup.y}%`,
                          transform: 'translate(-50%,-50%)',
                          background: 'var(--orange)',
                        }}
                      />
                    )}

                    {/* Render active pending markup box indicator */}
                    {addingIssue && pendingMarkup && pendingMarkup.type === 'rect' && (
                      <div
                        className="absolute w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-lg z-30"
                        style={{
                          left: `${pendingMarkup.x}%`,
                          top: `${pendingMarkup.y}%`,
                          transform: 'translate(-50%,-50%)',
                          background: 'var(--orange)',
                          color: 'white'
                        }}
                      >
                        Nu
                      </div>
                    )}

                    {/* Render active pending markup scribble indicator */}
                    {addingIssue && pendingMarkup && pendingMarkup.type === 'scribble' && (
                      <div
                        className="absolute w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-lg z-30"
                        style={{
                          left: `${pendingMarkup.x}%`,
                          top: `${pendingMarkup.y}%`,
                          transform: 'translate(-50%,-50%)',
                          background: 'var(--orange)',
                          color: 'white'
                        }}
                      >
                        Sc
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Fallback SVG display if no PDF exists
                <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                  <svg width="400" height="300" className="w-[500px] h-[375px]" viewBox="0 0 400 300">
                    <defs>
                      <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#334155" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect x="30" y="30" width="340" height="240" fill="none" stroke="#475569" strokeWidth="2.5" />
                    <rect x="40" y="40" width="118" height="118" fill="url(#hatch)" opacity="0.4" />
                    <line x1="160" y1="30" x2="160" y2="200" stroke="#475569" strokeWidth="1.5" />
                    <line x1="30" y1="150" x2="160" y2="150" stroke="#475569" strokeWidth="1.5" />
                    <line x1="250" y1="30" x2="250" y2="160" stroke="#475569" strokeWidth="1.5" />
                    <line x1="160" y1="200" x2="370" y2="200" stroke="#475569" strokeWidth="1.5" />
                    <line x1="30" y1="15" x2="370" y2="15" stroke="#475569" strokeWidth="0.5" />
                    <text x="200" y="12" textAnchor="middle" fill="#94a3b8" fontSize="8">8.50m</text>
                    <text x="90" y="95" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">SALA</text>
                    <text x="90" y="178" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">QUARTO 01</text>
                    <text x="205" y="90" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">COZINHA</text>
                    <text x="310" y="90" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">VARANDA</text>
                    <text x="265" y="228" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">QUARTO 02</text>
                    <rect x="30" y="260" width="340" height="30" fill="none" stroke="#475569" strokeWidth="0.5" />
                    <text x="40" y="278" fill="#94a3b8" fontSize="7">{drawing?.title || 'Planta de Exemplo'}</text>
                    <text x="350" y="278" textAnchor="end" fill="#94a3b8" fontSize="8" fontWeight="bold">{drawing?.revision || 'R00'}</text>
                  </svg>
                </div>
              )}
            </div>
          </div>
          {/* Zoom controls tooltip helper */}
          <div className="absolute bottom-2 left-2 pointer-events-none text-[9px]" style={{ color: 'var(--slate)' }}>
            Dica: Segure <span className="text-white font-bold">Ctrl + Roda do Mouse</span> para Zoom. Clique e arraste para mover o desenho (Pan).
          </div>
        </div>

        {/* Right panel – issues list + form */}
        <div className="w-80 flex-shrink-0 space-y-3 overflow-y-auto pr-1">
          {/* Add issue form */}
          {(addingIssue && pendingMarkup) && (
            <Card className="p-3 space-y-2 border-2" style={{ borderColor: 'var(--orange)' }}>
              <div className="text-xs font-bold" style={{ color: 'var(--orange)' }}>
                Nova Issue · {pendingMarkup.type === 'rect' ? 'Caixa demarcada' : pendingMarkup.type === 'scribble' ? 'Desenho livre' : 'Ponto marcado'}
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
                placeholder="Descrição das alterações solicitadas..."
                rows={3}
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
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => { setPendingMarkup(null); setDrawingPoints([]) }} className="flex-1">
                  Refazer
                </Button>
                <Button size="sm" onClick={saveIssue} disabled={!newIssue.title} className="flex-1">
                  Salvar Issue
                </Button>
              </div>
            </Card>
          )}

          {/* Selected issue detail view */}
          {selectedIssueData && (
            <Card className="p-3 space-y-2" style={{ border: '1px solid var(--navy-light)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Issue Selecionada</span>
                <button onClick={() => setSelectedIssue(null)} className="text-xs text-slate-500 hover:underline">Fechar</button>
              </div>
              <h4 className="text-sm font-bold text-white leading-tight">{selectedIssueData.title}</h4>
              <div className="flex gap-1.5 flex-wrap pt-0.5">
                <IssueCategoryBadge category={selectedIssueData.category} />
                <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold"
                  style={{
                    color: selectedIssueData.priority === 'alta' ? '#EF4444' : selectedIssueData.priority === 'media' ? '#EAB308' : '#3B82F6',
                    background: selectedIssueData.priority === 'alta' ? '#EF444422' : selectedIssueData.priority === 'media' ? '#EAB30822' : '#3B82F622'
                  }}
                >
                  {selectedIssueData.priority}
                </span>
              </div>
              <p className="text-xs text-slate-300 bg-surface-mid p-2 rounded whitespace-pre-line border border-surface-border">
                {parseIssueDescription(selectedIssueData.description).realDescription || 'Sem descrição.'}
              </p>
            </Card>
          )}

          {/* Issues list */}
          <div>
            <div className="text-xs font-semibold mb-2 flex items-center justify-between">
              <span style={{ color: 'var(--slate)' }}>
                <MessageSquare size={12} className="inline mr-1" />
                {issues.length} Issues
              </span>
              <span className="text-xs animate-pulse" style={{ color: '#EF4444' }}>
                {issues.filter(i => i.status === 'aberto').length} abertas
              </span>
            </div>
            <div className="space-y-2">
              {issues.map((issue, idx) => {
                const cat = CATEGORY_OPTIONS.find(c => c.value === issue.category)
                const markup = parseIssueDescription(issue.description)
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
                          <span className="text-[10px] text-slate-500 font-mono italic">
                            {markup.type === 'rect' ? 'Caixa' : markup.type === 'scribble' ? 'Desenho' : 'Ponto'}
                          </span>
                        </div>
                        {markup.realDescription && (
                          <div className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--slate)' }}>
                            {markup.realDescription}
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
