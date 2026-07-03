import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, GitCompare, Info, Loader2 } from 'lucide-react'
import { Card, Button } from '../../components/ui'
import { useDrawings } from '../../hooks/useDrawings'
import { useApp } from '../../context/AppContext'
import { MOCK_DRAWINGS } from '../../data/mockData'
import { renderPdfPage, createDifferenceCanvas, type RenderedPdfPage } from '../../lib/pdf-comparison'

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

export default function Comparar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentProject } = useApp()
  const projectId = currentProject.id

  const { drawings } = useDrawings(projectId)
  const drawing = (id ? drawings.find(d => d.id === id) : null) || MOCK_DRAWINGS[0]

  const versions = drawing.versions || []
  const latestRev = drawing.revision
  const [revLeft, setRevLeft] = useState(
    versions.length > 1 ? versions[versions.length - 2].revision : versions[0]?.revision || 'R00'
  )
  const [revRight, setRevRight] = useState(latestRev)
  const [page, setPage] = useState(1)

  // Three-panel slider
  const [sliderPos, setSliderPos] = useState(33)
  const [sliderPos2, setSliderPos2] = useState(66)
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    if (dragging === 'left') {
      setSliderPos(Math.max(10, Math.min(pct, sliderPos2 - 10)))
    } else {
      setSliderPos2(Math.max(sliderPos + 10, Math.min(pct, 90)))
    }
  }, [dragging, sliderPos, sliderPos2])

  const stopDrag = useCallback(() => setDragging(null), [])

  // Resolve PDF URLs from version list
  const leftVersion  = versions.find(v => v.revision === revLeft)
  const rightVersion = versions.find(v => v.revision === revRight)
  const leftUrl  = leftVersion?.pdfUrl  || drawing.pdfUrl || null
  const rightUrl = rightVersion?.pdfUrl || drawing.pdfUrl || null

  // PDF rendering state
  const [leftPage, setLeftPage] = useState<RenderedPdfPage | null>(null)
  const [rightPage, setRightPage] = useState<RenderedPdfPage | null>(null)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leftUrl || !rightUrl) return
    let cancelled = false
    setRendering(true)
    setError(null)

    Promise.all([
      renderPdfPage(leftUrl, page, false),
      renderPdfPage(rightUrl, page, false)
    ])
      .then(([left, right]) => {
        if (!cancelled) {
          setLeftPage(left)
          setRightPage(right)
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('[Comparar] Error rendering PDFs:', err)
          setError(err instanceof Error ? err.message : 'Erro ao renderizar PDFs de comparação.')
        }
      })
      .finally(() => {
        if (!cancelled) setRendering(false)
      })

    return () => {
      cancelled = true
    }
  }, [leftUrl, rightUrl, page])

  // Generate difference canvas dynamically
  const diffCanvas = useMemo(() => {
    if (!leftPage || !rightPage) return null
    return createDifferenceCanvas(leftPage.canvas, rightPage.canvas, 25)
  }, [leftPage, rightPage])

  const pageCount = Math.min(leftPage?.pageCount ?? 1, rightPage?.pageCount ?? 1)

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/projetos')}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: 'var(--slate)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <GitCompare size={16} style={{ color: 'var(--orange)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
              Comparar Revisões
            </span>
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--slate)' }}>
            {drawing.code.replace(drawing.revision, '').replace(/-$/, '')}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Page selector */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
              disabled={page <= 1 || rendering}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ color: 'var(--white)' }}>Pág. {page} / {pageCount}</span>
            <button
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--slate)' }}
              disabled={page >= pageCount || rendering}
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs p-2 rounded-lg"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
            <Info size={12} style={{ color: 'var(--slate)' }} />
            <span style={{ color: 'var(--slate)' }}>Arraste as barras para comparar</span>
          </div>
        </div>
      </div>

      {/* Version selectors */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <Card className="p-3">
          <div className="text-xs mb-2" style={{ color: 'var(--slate)' }}>Versão Esquerda</div>
          <select
            value={revLeft}
            onChange={e => setRevLeft(e.target.value)}
            className="w-full text-sm rounded px-2 py-1.5 outline-none font-mono"
            style={{ background: 'var(--surface-mid)', border: '1px solid #3B82F6', color: '#3B82F6' }}
          >
            {versions.map(v => (
              <option key={v.revision} value={v.revision}>{v.revision}</option>
            ))}
            {versions.length === 0 && <option value={revLeft}>{revLeft}</option>}
          </select>
        </Card>
        <Card className="p-3" style={{ border: '1px solid rgba(249,115,22,0.3)' }}>
          <div className="text-xs mb-2" style={{ color: 'var(--orange)' }}>
            Centro – Diferenças destacadas
          </div>
          <div className="text-xs font-mono font-bold" style={{ color: 'var(--orange)' }}>
            PIXEL DIFF (Vermelho = Alteração)
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs mb-2" style={{ color: 'var(--slate)' }}>Versão Direita</div>
          <select
            value={revRight}
            onChange={e => setRevRight(e.target.value)}
            className="w-full text-sm rounded px-2 py-1.5 outline-none font-mono"
            style={{ background: 'var(--surface-mid)', border: '1px solid #22C55E', color: '#22C55E' }}
          >
            {versions.map(v => (
              <option key={v.revision} value={v.revision}>{v.revision}</option>
            ))}
            {versions.length === 0 && <option value={revRight}>{revRight}</option>}
          </select>
        </Card>
      </div>

      {/* Revision history pills */}
      {versions.length > 0 && (
        <Card className="p-3 flex-shrink-0">
          <div className="text-xs mb-2 font-semibold" style={{ color: 'var(--slate)' }}>
            Histórico de Revisões
          </div>
          <div className="flex gap-2 flex-wrap">
            {versions.map(v => (
              <button
                key={v.revision}
                onClick={() => { if (v.revision !== revRight) setRevLeft(v.revision) }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: v.revision === revRight || v.revision === revLeft ? 'var(--navy-mid)' : 'var(--surface-mid)',
                  border: `1px solid ${v.revision === revRight ? '#22C55E' : v.revision === revLeft ? '#3B82F6' : 'var(--surface-border)'}`,
                  color: v.revision === revRight ? '#22C55E' : v.revision === revLeft ? '#3B82F6' : 'var(--slate)',
                }}
              >
                <span className="font-mono font-bold">{v.revision}</span>
                <span>{new Date(v.sentAt).toLocaleDateString('pt-BR')}</span>
                <span className={v.status === 'aprovado' || v.status === 'liberado_para_obra' ? 'text-green-400' : 'text-yellow-400'}>
                  {v.status === 'aprovado' || v.status === 'liberado_para_obra' ? '✓' : '…'}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 rounded-xl text-sm" style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444' }}>
          {error}
        </div>
      )}

      {/* Three-panel comparison viewer with unified stacked scroll */}
      <div className="flex-1 min-h-[450px] relative rounded-xl border overflow-auto bg-white" style={{ borderColor: 'var(--surface-border)' }}>
        {rendering && (
          <div className="absolute inset-0 bg-[#0d1825]/40 backdrop-blur-xs flex items-center justify-center z-30">
            <Loader2 className="animate-spin text-orange-500" size={32} />
          </div>
        )}

        {leftPage && rightPage && (
          <div
            ref={containerRef}
            className="relative select-none mx-auto"
            style={{
              width: `${leftPage.canvas.width}px`,
              height: `${leftPage.canvas.height}px`,
              maxWidth: '100%'
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
          >
            {/* Panel 1 (Bottom): older revision */}
            <div className="absolute inset-0 z-0">
              <CanvasView source={leftPage.canvas} className="w-full h-full" />
            </div>

            {/* Panel 2 (Middle): difference canvas (clipped between sliders) */}
            <div
              className="absolute inset-0 z-10 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPos2}% 0 ${sliderPos}%)` }}
            >
              <CanvasView source={diffCanvas} className="w-full h-full" />
            </div>

            {/* Panel 3 (Top): latest revision (clipped to right of slider 2) */}
            <div
              className="absolute inset-0 z-10 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${sliderPos2}%)` }}
            >
              <CanvasView source={rightPage.canvas} className="w-full h-full" />
            </div>

            {/* Left Slider controller */}
            <div
              className="absolute inset-y-0 z-20 flex items-center justify-center cursor-ew-resize"
              style={{ left: `${sliderPos}%`, width: '4px', background: '#3B82F6' }}
              onMouseDown={() => setDragging('left')}
            >
              <div className="absolute w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ background: '#3B82F6', color: 'white' }}>
                <ChevronLeft size={14} className="-mr-1" />
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Right Slider controller */}
            <div
              className="absolute inset-y-0 z-20 flex items-center justify-center cursor-ew-resize"
              style={{ left: `${sliderPos2}%`, width: '4px', background: '#22C55E' }}
              onMouseDown={() => setDragging('right')}
            >
              <div className="absolute w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ background: '#22C55E', color: 'white' }}>
                <ChevronLeft size={14} className="-mr-1" />
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        )}

        {/* Labels overlay at top of viewer */}
        {leftPage && rightPage && (
          <div className="sticky top-0 left-0 right-0 flex z-20 pointer-events-none select-none">
            <div className="text-xs font-semibold px-3 py-1 flex items-center justify-center"
              style={{ width: `${sliderPos}%`, background: 'rgba(59,130,246,0.85)', color: 'white' }}>
              Versão {revLeft}
            </div>
            <div className="text-xs font-semibold px-3 py-1 flex items-center justify-center"
              style={{ width: `${sliderPos2 - sliderPos}%`, background: 'rgba(249,115,22,0.85)', color: 'white' }}>
              Diferenças destacadas (Pixel Diff)
            </div>
            <div className="text-xs font-semibold px-3 py-1 flex-1 flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.85)', color: 'white' }}>
              Versão {revRight}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projetos/${id}/revisao`)}>
          Abrir para Revisão
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projetos/${id}/sobrepor`)}>
          Ir para Sobreposição
        </Button>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          Exportar Comparação
        </Button>
      </div>
    </div>
  )
}
