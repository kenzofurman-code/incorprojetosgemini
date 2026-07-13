import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileCheck, Plus, MessageSquare,
  CheckCircle, XCircle, AlertTriangle, Layers, Loader2,
  ZoomIn, ZoomOut, Square, Edit3, MapPin,
  Cloud, Type, Image as ImageIcon, Hexagon, ArrowUpRight, X
} from 'lucide-react'
import { Card, Button, IssueCategoryBadge, StatusBadge, DataSourceBadge, DrawingQrCode } from '../../components/ui'
import { MOCK_DRAWINGS } from '../../data/mockData'
import { useReviews } from '../../hooks/useReviews'
import { useDrawings } from '../../hooks/useDrawings'
import { useApp } from '../../context/AppContext'
import type { Issue, IssueCategory } from '../../types'
import { renderPdfPage, type RenderedPdfPage } from '../../lib/pdf-comparison'
import QRCode from 'qrcode'

const CATEGORY_OPTIONS: { value: IssueCategory; label: string; color: string }[] = [
  { value: 'conflito_projeto',  label: 'Conflito de Projeto',  color: '#EF4444' },
  { value: 'incompletude',      label: 'Incompletude',         color: '#F97316' },
  { value: 'erro_cota',         label: 'Erro de Cota',         color: '#EAB308' },
  { value: 'falta_detalhe',     label: 'Falta de Detalhe',     color: '#3B82F6' },
  { value: 'nomenclatura',      label: 'Nomenclatura',         color: '#8B5CF6' },
  { value: 'compatibilizacao',  label: 'Compatibilização',     color: '#06B6D4' },
  { value: 'outro',             label: 'Outro',                color: '#6B7280' },
]

function getCloudPath(xPct: number, yPct: number, wPct: number, hPct: number, width: number, height: number): string {
  const x = (xPct / 100) * width
  const y = (yPct / 100) * height
  const w = (wPct / 100) * width
  const h = (hPct / 100) * height
  
  const step = 15 // wave bubble size
  let path = `M ${x} ${y}`
  
  // Top
  for (let cur = x; cur < x + w; cur += step) {
    const next = Math.min(cur + step, x + w)
    const mid = (cur + next) / 2
    path += ` Q ${mid} ${y - 4} ${next} ${y}`
  }
  // Right
  for (let cur = y; cur < y + h; cur += step) {
    const next = Math.min(cur + step, y + h)
    const mid = (cur + next) / 2
    path += ` Q ${x + w + 4} ${mid} ${x + w} ${next}`
  }
  // Bottom
  for (let cur = x + w; cur > x; cur -= step) {
    const next = Math.max(cur - step, x)
    const mid = (cur + next) / 2
    path += ` Q ${mid} ${y + h + 4} ${next} ${y + h}`
  }
  // Left
  for (let cur = y + h; cur > y; cur -= step) {
    const next = Math.max(cur - step, y)
    const mid = (cur + next) / 2
    path += ` Q ${x - 4} ${mid} ${x} ${next}`
  }
  
  path += ' Z'
  return path
}

// Parse serialized markup from description
interface ParsedMarkup {
  type: 'pin' | 'rect' | 'scribble' | 'arrow' | 'cloud' | 'polygon' | 'text'
  x: number
  y: number
  w?: number
  h?: number
  points?: { x: number; y: number }[]
  color?: string
  fillOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  text?: string
  fontSize?: number
  imageUrl?: string
  realDescription: string
}

function parseIssueDescription(desc: string): ParsedMarkup {
  try {
    const data = JSON.parse(desc)
    if (data && typeof data === 'object' && data.type) {
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

function PositionedQrCode({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !code) return
    QRCode.toCanvas(canvasRef.current, code, {
      width: 41, // fits 45px wrapper with padding
      margin: 0,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    }).catch(err => console.error('[PositionedQrCode] Error generating QR:', err))
  }, [code])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
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
  const [markupTool, setMarkupTool] = useState<'pin' | 'rect' | 'scribble' | 'arrow' | 'cloud' | 'polygon' | 'text'>('pin')

  // Advanced Styling states
  const [markupColor, setMarkupColor] = useState('#EF4444')
  const [markupFillOpacity, setMarkupFillOpacity] = useState(20)
  const [markupStrokeWidth, setMarkupStrokeWidth] = useState(3)
  const [markupStrokeDash, setMarkupStrokeDash] = useState<'solid' | 'dashed'>('solid')
  const [markupFontSize, setMarkupFontSize] = useState(16)

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

  // Zoom & Pan State
  const [scale, setScale] = useState(1)
  const [renderedScale, setRenderedScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [spacePressed, setSpacePressed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!drawing?.pdfUrl) return
    let cancelled = false
    setRenderingPdf(true)
    setPdfError(null)

    // Render page canvas at scale 2.5 * renderedScale
    const targetScale = 2.5 * renderedScale

    renderPdfPage(drawing.pdfUrl, 1, false, targetScale)
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
  }, [drawing?.pdfUrl, renderedScale])

  const dimensions = renderedPage
    ? { width: renderedPage.canvas.width / renderedScale, height: renderedPage.canvas.height / renderedScale }
    : { width: 800, height: 600 }



  // Debounce scale updates to avoid lagging during zoom wheel
  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderedScale(scale)
    }, 250)
    return () => clearTimeout(timer)
  }, [scale])

  // Fit to screen on initial load
  useEffect(() => {
    if (!renderedPage || !containerRef.current) return
    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const pageWidth = renderedPage.canvas.width / renderedScale
    const pageHeight = renderedPage.canvas.height / renderedScale

    if (containerWidth > 0 && containerHeight > 0) {
      const scaleX = containerWidth / pageWidth
      const scaleY = containerHeight / pageHeight
      const newScale = Math.min(scaleX, scaleY) * 0.95
      const newOffsetX = (containerWidth - pageWidth * newScale) / 2
      const newOffsetY = (containerHeight - pageHeight * newScale) / 2

      setScale(newScale)
      setRenderedScale(newScale)
      setOffset({ x: newOffsetX, y: newOffsetY })
    }
  }, [drawing?.pdfUrl])

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
          color: markupColor,
        })
      } else if (markupTool === 'rect' || markupTool === 'cloud' || markupTool === 'arrow') {
        setBoxStart({ x: xPct, y: yPct })
        setBoxCurrent({ x: xPct, y: yPct })
      } else if (markupTool === 'scribble') {
        setDrawingPoints([{ x: xPct, y: yPct }])
      } else if (markupTool === 'polygon') {
        setDrawingPoints(prev => [...prev, { x: xPct, y: yPct }])
      } else if (markupTool === 'text') {
        setPendingMarkup({
          type: 'text',
          x: xPct,
          y: yPct,
          text: '',
          color: markupColor,
          fontSize: markupFontSize,
        })
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

      if ((markupTool === 'rect' || markupTool === 'cloud' || markupTool === 'arrow') && boxStart) {
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
            x, y, w, h,
            color: markupColor,
            fillOpacity: markupFillOpacity,
            strokeWidth: markupStrokeWidth,
            strokeDasharray: markupStrokeDash === 'dashed' ? '4 2' : undefined,
          })
        }
        setBoxStart(null)
        setBoxCurrent(null)
      } else if (markupTool === 'cloud' && boxStart && boxCurrent) {
        const x = Math.min(boxStart.x, boxCurrent.x)
        const y = Math.min(boxStart.y, boxCurrent.y)
        const w = Math.abs(boxStart.x - boxCurrent.x)
        const h = Math.abs(boxStart.y - boxCurrent.y)
        if (w > 0.5 && h > 0.5) {
          setPendingMarkup({
            type: 'cloud',
            x, y, w, h,
            color: markupColor,
            fillOpacity: markupFillOpacity,
            strokeWidth: markupStrokeWidth,
          })
        }
        setBoxStart(null)
        setBoxCurrent(null)
      } else if (markupTool === 'arrow' && boxStart && boxCurrent) {
        const w = boxCurrent.x - boxStart.x
        const h = boxCurrent.y - boxStart.y
        if (Math.abs(w) > 0.5 || Math.abs(h) > 0.5) {
          setPendingMarkup({
            type: 'arrow',
            x: boxStart.x,
            y: boxStart.y,
            w, h,
            color: markupColor,
            strokeWidth: markupStrokeWidth,
            strokeDasharray: markupStrokeDash === 'dashed' ? '4 2' : undefined,
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
          color: markupColor,
          strokeWidth: markupStrokeWidth,
        })
        setDrawingPoints([])
      }
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (addingIssue && markupTool === 'polygon' && drawingPoints.length > 1) {
      setPendingMarkup({
        type: 'polygon',
        x: drawingPoints[0].x,
        y: drawingPoints[0].y,
        points: drawingPoints,
        color: markupColor,
        fillOpacity: markupFillOpacity,
        strokeWidth: markupStrokeWidth,
      })
      setDrawingPoints([])
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
      color: pendingMarkup.color || markupColor,
      fillOpacity: pendingMarkup.fillOpacity != null ? pendingMarkup.fillOpacity : markupFillOpacity,
      strokeWidth: pendingMarkup.strokeWidth || markupStrokeWidth,
      strokeDasharray: pendingMarkup.strokeDasharray || (markupStrokeDash === 'dashed' ? '4 2' : undefined),
      text: pendingMarkup.text,
      fontSize: pendingMarkup.fontSize || markupFontSize,
      imageUrl: pendingMarkup.imageUrl,
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
        <Card className="p-3 bg-slate-900 border-orange-500/30 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-orange-400 flex items-center gap-2">
              <Edit3 size={14} /> Modo Marcação Ativo: Escolha uma ferramenta e desenhe na prancha.
            </div>
            <button onClick={() => { setAddingIssue(false); setPendingMarkup(null); setDrawingPoints([]) }} className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer">
              Cancelar
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-800">
            {/* Tools select */}
            <div className="flex items-center gap-1">
              {[
                { type: 'pin', label: 'Ponto', icon: <MapPin size={12} /> },
                { type: 'rect', label: 'Caixa', icon: <Square size={12} /> },
                { type: 'cloud', label: 'Nuvem', icon: <Cloud size={12} /> },
                { type: 'scribble', label: 'Lápis', icon: <Edit3 size={12} /> },
                { type: 'arrow', label: 'Seta', icon: <ArrowUpRight size={12} /> },
                { type: 'polygon', label: 'Polígono', icon: <Hexagon size={12} /> },
                { type: 'text', label: 'Texto', icon: <Type size={12} /> }
              ].map(tool => (
                <button
                  key={tool.type}
                  onClick={() => { setMarkupTool(tool.type as any); setPendingMarkup(null); setDrawingPoints([]) }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
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

            <div className="h-6 w-px bg-slate-800" />

            {/* Style bar */}
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              {/* Color picker */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Cor:</span>
                <div className="flex gap-0.5">
                  {['#EF4444', '#22C55E', '#3B82F6', '#EAB308', '#F97316', '#111827'].map(c => (
                    <button
                      key={c}
                      onClick={() => setMarkupColor(c)}
                      className="w-3.5 h-3.5 rounded-full transition-all cursor-pointer"
                      style={{
                        background: c,
                        border: markupColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="h-4 w-px bg-slate-800" />

              {/* Opacity */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Preenchimento:</span>
                <select
                  value={markupFillOpacity}
                  onChange={e => setMarkupFillOpacity(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-white rounded px-1.5 py-0.5 outline-none cursor-pointer"
                >
                  <option value={0}>Sem fundo</option>
                  <option value={20}>20% (Marca-texto)</option>
                  <option value={50}>50%</option>
                  <option value={80}>80%</option>
                  <option value={100}>100%</option>
                </select>
              </div>

              <div className="h-4 w-px bg-slate-800" />

              {/* Stroke Style */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Linha:</span>
                <select
                  value={markupStrokeDash}
                  onChange={e => setMarkupStrokeDash(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 text-white rounded px-1.5 py-0.5 outline-none cursor-pointer"
                >
                  <option value="solid">Contínua</option>
                  <option value="dashed">Tracejada</option>
                </select>
              </div>

              <div className="h-4 w-px bg-slate-800" />

              {/* Font Size */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Texto:</span>
                <select
                  value={markupFontSize}
                  onChange={e => setMarkupFontSize(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-white rounded px-1.5 py-0.5 outline-none cursor-pointer"
                >
                  <option value={12}>12px</option>
                  <option value={16}>16px</option>
                  <option value={24}>24px</option>
                </select>
              </div>
            </div>
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
            onContextMenu={handleContextMenu}
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

                  {/* Positioned QR Code on the Title Block / Carimbo */}
                  {drawing?.qrCodeX != null && drawing?.qrCodeY != null && (
                    <div
                      className="absolute p-0.5 rounded bg-white shadow-lg z-10 pointer-events-auto border border-orange-500/20"
                      style={{
                        left: `${drawing.qrCodeX}%`,
                        top: `${drawing.qrCodeY}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '45px',
                        height: '45px',
                        background: '#ffffff',
                      }}
                      title={`QR Code da prancha: ${drawing.code}`}
                    >
                      <PositionedQrCode code={drawing.code} />
                    </div>
                  )}

                  {/* SVG Vector Overlays for Box/Scribble/Cloud/Arrow/Polygon/Text Markups */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {/* Render saved markups from issues database */}
                    {issues.map(issue => {
                      const markup = parseIssueDescription(issue.description)
                      const cat = CATEGORY_OPTIONS.find(c => c.value === issue.category)
                      const baseColor = cat?.color || '#EF4444'
                      const color = markup.color || baseColor
                      const fillOpacity = markup.fillOpacity != null ? markup.fillOpacity / 100 : 0
                      const strokeWidth = markup.strokeWidth || 3
                      const strokeDasharray = markup.strokeDasharray || undefined

                      if (markup.type === 'rect' && markup.w && markup.h) {
                        return (
                          <rect
                            key={issue.id}
                            x={`${markup.x}%`}
                            y={`${markup.y}%`}
                            width={`${markup.w}%`}
                            height={`${markup.h}%`}
                            fill={fillOpacity > 0 ? color : 'none'}
                            fillOpacity={fillOpacity}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDasharray}
                          />
                        )
                      }
                      if (markup.type === 'cloud' && markup.w && markup.h) {
                        const pathData = getCloudPath(markup.x, markup.y, markup.w, markup.h, dimensions.width, dimensions.height)
                        return (
                          <path
                            key={issue.id}
                            d={pathData}
                            fill={fillOpacity > 0 ? color : 'none'}
                            fillOpacity={fillOpacity}
                            stroke={color}
                            strokeWidth={strokeWidth}
                          />
                        )
                      }
                      if (markup.type === 'arrow' && markup.w != null && markup.h != null) {
                        const x1 = (markup.x / 100) * dimensions.width
                        const y1 = (markup.y / 100) * dimensions.height
                        const x2 = ((markup.x + markup.w) / 100) * dimensions.width
                        const y2 = ((markup.y + markup.h) / 100) * dimensions.height
                        const angle = Math.atan2(y2 - y1, x2 - x1)
                        const arrowLength = 12
                        const h1x = x2 - arrowLength * Math.cos(angle - Math.PI / 6)
                        const h1y = y2 - arrowLength * Math.sin(angle - Math.PI / 6)
                        const h2x = x2 - arrowLength * Math.cos(angle + Math.PI / 6)
                        const h2y = y2 - arrowLength * Math.sin(angle + Math.PI / 6)
                        return (
                          <g key={issue.id}>
                            <line
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke={color}
                              strokeWidth={strokeWidth}
                              strokeDasharray={strokeDasharray}
                            />
                            <polygon
                              points={`${x2},${y2} ${h1x},${h1y} ${h2x},${h2y}`}
                              fill={color}
                            />
                          </g>
                        )
                      }
                      if (markup.type === 'polygon' && markup.points) {
                        const ptsStr = markup.points.map(p => `${(p.x / 100) * dimensions.width},${(p.y / 100) * dimensions.height}`).join(' ')
                        return (
                          <polygon
                            key={issue.id}
                            points={ptsStr}
                            fill={fillOpacity > 0 ? color : 'none'}
                            fillOpacity={fillOpacity}
                            stroke={color}
                            strokeWidth={strokeWidth}
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
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )
                      }
                      if (markup.type === 'text' && markup.text) {
                        return (
                          <text
                            key={issue.id}
                            x={`${markup.x}%`}
                            y={`${markup.y}%`}
                            fill={color}
                            fontSize={`${markup.fontSize || 14}px`}
                            fontWeight="bold"
                            dominantBaseline="middle"
                          >
                            {markup.text}
                          </text>
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
                        fill={markupFillOpacity > 0 ? markupColor : 'rgba(239, 68, 68, 0.05)'}
                        fillOpacity={markupFillOpacity / 100}
                        stroke={markupColor}
                        strokeWidth={markupStrokeWidth}
                        strokeDasharray={markupStrokeDash === 'dashed' ? '4 2' : undefined}
                      />
                    )}

                    {addingIssue && markupTool === 'cloud' && boxStart && boxCurrent && (
                      <path
                        d={getCloudPath(
                          Math.min(boxStart.x, boxCurrent.x),
                          Math.min(boxStart.y, boxCurrent.y),
                          Math.abs(boxStart.x - boxCurrent.x),
                          Math.abs(boxStart.y - boxCurrent.y),
                          dimensions.width,
                          dimensions.height
                        )}
                        fill={markupFillOpacity > 0 ? markupColor : 'none'}
                        fillOpacity={markupFillOpacity / 100}
                        stroke={markupColor}
                        strokeWidth={markupStrokeWidth}
                      />
                    )}

                    {addingIssue && markupTool === 'arrow' && boxStart && boxCurrent && (() => {
                      const x1 = (boxStart.x / 100) * dimensions.width
                      const y1 = (boxStart.y / 100) * dimensions.height
                      const x2 = (boxCurrent.x / 100) * dimensions.width
                      const y2 = (boxCurrent.y / 100) * dimensions.height
                      const angle = Math.atan2(y2 - y1, x2 - x1)
                      const arrowLength = 12
                      const h1x = x2 - arrowLength * Math.cos(angle - Math.PI / 6)
                      const h1y = y2 - arrowLength * Math.sin(angle - Math.PI / 6)
                      const h2x = x2 - arrowLength * Math.cos(angle + Math.PI / 6)
                      const h2y = y2 - arrowLength * Math.sin(angle + Math.PI / 6)
                      return (
                        <g>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={markupColor}
                            strokeWidth={markupStrokeWidth}
                            strokeDasharray={markupStrokeDash === 'dashed' ? '4 2' : undefined}
                          />
                          <polygon
                            points={`${x2},${y2} ${h1x},${h1y} ${h2x},${h2y}`}
                            fill={markupColor}
                          />
                        </g>
                      )
                    })()}

                    {addingIssue && markupTool === 'polygon' && drawingPoints.length > 0 && (
                      <g>
                        <polyline
                          points={drawingPoints.map(p => `${(p.x / 100) * dimensions.width},${(p.y / 100) * dimensions.height}`).join(' ')}
                          fill={markupFillOpacity > 0 ? markupColor : 'none'}
                          fillOpacity={markupFillOpacity / 100}
                          stroke={markupColor}
                          strokeWidth={markupStrokeWidth}
                        />
                        {drawingPoints.map((p, i) => (
                          <circle
                            key={i}
                            cx={(p.x / 100) * dimensions.width}
                            cy={(p.y / 100) * dimensions.height}
                            r="4"
                            fill={markupColor}
                            stroke="white"
                            strokeWidth="1.5"
                          />
                        ))}
                      </g>
                    )}

                    {addingIssue && markupTool === 'scribble' && drawingPoints.length > 1 && (
                      <path
                        d={drawingPoints.map((p, i) =>
                          `${i === 0 ? 'M' : 'L'} ${(p.x / 100) * dimensions.width} ${(p.y / 100) * dimensions.height}`
                        ).join(' ')}
                        fill="none"
                        stroke={markupColor}
                        strokeWidth={markupStrokeWidth}
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

                    {/* Render active pending markup indicator */}
                    {addingIssue && pendingMarkup && (
                      <div
                        className="absolute w-5.5 h-5.5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold shadow-lg z-30 animate-pulse"
                        style={{
                          left: `${pendingMarkup.x}%`,
                          top: `${pendingMarkup.y}%`,
                          transform: 'translate(-50%,-50%)',
                          background: 'var(--orange)',
                          color: 'white'
                        }}
                      >
                        {pendingMarkup.type === 'rect' && 'Cx'}
                        {pendingMarkup.type === 'cloud' && 'Nv'}
                        {pendingMarkup.type === 'scribble' && 'Ds'}
                        {pendingMarkup.type === 'arrow' && 'St'}
                        {pendingMarkup.type === 'polygon' && 'Pl'}
                        {pendingMarkup.type === 'text' && 'Tx'}
                        {pendingMarkup.type === 'pin' && 'Pt'}
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
            <Card className="p-3 space-y-2.5 border-2 bg-slate-900/50" style={{ borderColor: 'var(--orange)' }}>
              <div className="text-xs font-bold font-mono" style={{ color: 'var(--orange)' }}>
                Nova Issue · {
                  pendingMarkup.type === 'rect' ? 'Caixa de Marcação' :
                  pendingMarkup.type === 'cloud' ? 'Nuvem de Revisão' :
                  pendingMarkup.type === 'scribble' ? 'Desenho Livre' :
                  pendingMarkup.type === 'arrow' ? 'Seta Indicativa' :
                  pendingMarkup.type === 'polygon' ? 'Polígono' :
                  pendingMarkup.type === 'text' ? 'Texto' : 'Ponto'
                }
              </div>

              {pendingMarkup.type === 'text' && (
                <input
                  type="text"
                  placeholder="Texto a exibir no desenho *"
                  value={pendingMarkup.text || ''}
                  onChange={e => setPendingMarkup({ ...pendingMarkup, text: e.target.value })}
                  className="w-full text-sm rounded px-2 py-1.5 outline-none font-bold"
                  style={{ background: 'var(--surface-mid)', border: '1px solid var(--orange)', color: 'var(--white)' }}
                />
              )}

              <input
                type="text"
                placeholder="Título da issue *"
                value={newIssue.title}
                onChange={e => setNewIssue({ ...newIssue, title: e.target.value })}
                className="w-full text-sm rounded px-2 py-1.5 outline-none"
                style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
              />
              
              <textarea
                placeholder="Descrição das alterações solicitadas..."
                rows={3}
                value={newIssue.description}
                onChange={e => setNewIssue({ ...newIssue, description: e.target.value })}
                className="w-full text-sm rounded px-2 py-1.5 outline-none resize-none"
                style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
              />
              
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newIssue.category}
                  onChange={e => setNewIssue({ ...newIssue, category: e.target.value as IssueCategory })}
                  className="text-xs rounded px-1.5 py-1.5 outline-none"
                  style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
                >
                  {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select
                  value={newIssue.priority}
                  onChange={e => setNewIssue({ ...newIssue, priority: e.target.value as any })}
                  className="text-xs rounded px-1.5 py-1.5 outline-none"
                  style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
                >
                  <option value="alta">Prioridade Alta</option>
                  <option value="media">Prioridade Média</option>
                  <option value="baixa">Prioridade Baixa</option>
                </select>
              </div>

              {/* Photo attachment input */}
              <div className="space-y-1 border-t border-slate-800 pt-2">
                <span className="text-[10px] text-slate-400 font-semibold block">Anexar Foto de Campo (Opcional)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setPendingMarkup({ ...pendingMarkup, imageUrl: reader.result as string })
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
                />
                {pendingMarkup.imageUrl && (
                  <div className="relative w-full h-24 rounded border border-slate-700 overflow-hidden bg-slate-950 mt-1 flex items-center justify-center">
                    <img src={pendingMarkup.imageUrl} className="max-w-full max-h-full object-contain" />
                    <button
                      onClick={() => setPendingMarkup({ ...pendingMarkup, imageUrl: undefined })}
                      className="absolute top-1 right-1 p-0.5 bg-red-600 rounded-full text-white hover:bg-red-500 cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1 border-t border-slate-800">
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
                <button onClick={() => setSelectedIssue(null)} className="text-xs text-slate-500 hover:underline font-semibold cursor-pointer">Fechar</button>
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
              {(() => {
                const markup = parseIssueDescription(selectedIssueData.description)
                return markup.imageUrl ? (
                  <div className="mt-3 space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block">FOTO ANEXADA:</span>
                    <div className="relative w-full rounded border border-slate-700 overflow-hidden bg-slate-950 flex items-center justify-center cursor-zoom-in group">
                      <img src={markup.imageUrl} className="max-w-full max-h-48 object-contain transition-transform group-hover:scale-105" />
                      <a
                        href={markup.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
                      >
                        Visualizar Foto Original ↗
                      </a>
                    </div>
                  </div>
                ) : null
              })()}
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
