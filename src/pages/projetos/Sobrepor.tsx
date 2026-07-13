import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Layers, Plus, Eye, EyeOff, Move, Palette, Loader2, ArrowUp, ArrowDown, Check, X, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { Card, Button } from '../../components/ui'
import { useDrawings } from '../../hooks/useDrawings'
import { useApp } from '../../context/AppContext'
import { MOCK_DRAWINGS } from '../../data/mockData'
import { renderPdfPage, tintDrawing, type RenderedPdfPage } from '../../lib/pdf-comparison'

const OVERLAY_COLORS = ['#EF4444', '#22C55E', '#3B82F6', '#F97316', '#EAB308', '#8B5CF6', '#06B6D4', '#000000']

interface LayerDoc {
  id: string
  code: string
  discipline: string
  color: string
  opacity: number
  visible: boolean
  isBase: boolean
  pdfUrl?: string | null
  // 2-point reference alignment transform
  alignmentTransform?: {
    scale: number
    angle: number
    base1: { x: number; y: number }
    base2: { x: number; y: number }
    layer1: { x: number; y: number }
    layer2: { x: number; y: number }
  } | null
}

interface AlignState {
  active: boolean
  layerId: string | null
  step: 'base1' | 'base2' | 'layer1' | 'layer2' | 'done'
  base1?: { x: number; y: number }
  base2?: { x: number; y: number }
  layer1?: { x: number; y: number }
  layer2?: { x: number; y: number }
}

export default function Sobrepor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentProject } = useApp()
  const projectId = currentProject.id
  const { drawings } = useDrawings(projectId)

  const baseDrawing = (id ? drawings.find(d => d.id === id) : null) || MOCK_DRAWINGS[0]
  const secondDrawing = drawings.find(d => d.id !== baseDrawing.id) || MOCK_DRAWINGS[4]

  const [layers, setLayers] = useState<LayerDoc[]>([
    {
      id: baseDrawing.id,
      code: baseDrawing.code,
      discipline: baseDrawing.discipline,
      color: '#000000',
      opacity: 100,
      visible: true,
      isBase: true,
      pdfUrl: baseDrawing.pdfUrl || null,
      alignmentTransform: null,
    },
    {
      id: secondDrawing.id,
      code: secondDrawing.code,
      discipline: secondDrawing.discipline,
      color: '#EF4444',
      opacity: 70,
      visible: true,
      isBase: false,
      pdfUrl: secondDrawing.pdfUrl || null,
      alignmentTransform: null,
    },
  ])

  const [removeText, setRemoveText] = useState(false)
  const [page, setPage] = useState(1)

  // ─── Drag and Drop / Reordering logic ───────────────────────────────────────
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  function moveLayer(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= layers.length) return
    const reordered = [...layers]
    const temp = reordered[index]
    reordered[index] = reordered[nextIndex]
    reordered[nextIndex] = temp
    setLayers(reordered)
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const reordered = [...layers]
    const draggedItem = reordered[draggedIndex]
    reordered.splice(draggedIndex, 1)
    reordered.splice(index, 0, draggedItem)
    setDraggedIndex(index)
    setLayers(reordered)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
  }

  function updateLayer(layerId: string, updates: Partial<LayerDoc>) {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, ...updates } : l))
  }

  function addLayer() {
    const unused = drawings.find(d => !layers.find(l => l.id === d.id))
    if (!unused) return
    setLayers(prev => [...prev, {
      id: unused.id,
      code: unused.code,
      discipline: unused.discipline,
      color: OVERLAY_COLORS[prev.length % OVERLAY_COLORS.length],
      opacity: 70,
      visible: true,
      isBase: false,
      pdfUrl: unused.pdfUrl || null,
      alignmentTransform: null,
    }])
  }

  const visibleLayers = layers.filter(l => l.visible)

  // ─── 2-Point Reference Alignment State ──────────────────────────────────────
  const [alignState, setAlignState] = useState<AlignState>({
    active: false,
    layerId: null,
    step: 'base1',
  })

  function startAlignment(layerId: string) {
    setAlignState({
      active: true,
      layerId,
      step: 'base1',
    })
  }

  function cancelAlignment() {
    setAlignState({
      active: false,
      layerId: null,
      step: 'base1',
    })
  }

  function resetAlignment(layerId: string) {
    updateLayer(layerId, { alignmentTransform: null })
  }

  // ─── PDF Render & Tint Pipeline ─────────────────────────────────────────────
  const [renderedPages, setRenderedPages] = useState<Record<string, RenderedPdfPage>>({})
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const activeLayers = visibleLayers.filter(l => l.pdfUrl)
    if (activeLayers.length === 0) return

    setRendering(true)
    setError(null)

    // Render all visible PDFs concurrently
    Promise.all(
      activeLayers.map(l =>
        renderPdfPage(l.pdfUrl!, page, removeText)
          .then(rendered => ({ id: l.id, rendered }))
      )
    )
      .then(results => {
        if (cancelled) return
        const newPages: Record<string, RenderedPdfPage> = {}
        for (const item of results) {
          newPages[item.id] = item.rendered
        }
        setRenderedPages(newPages)
      })
      .catch(err => {
        if (!cancelled) {
          console.error('[Sobrepor] Error rendering overlay:', err)
          setError(err instanceof Error ? err.message : 'Erro ao renderizar sobreposição de PDFs.')
        }
      })
      .finally(() => {
        if (!cancelled) setRendering(false)
      })

    return () => {
      cancelled = true
    }
  }, [visibleLayers.length, page, removeText, layers])

  // Apply tint Drawing to rendered canvas outputs
  const tintedCanvases = useMemo(() => {
    const tinted: Record<string, HTMLCanvasElement> = {}
    for (const layer of visibleLayers) {
      const rendered = renderedPages[layer.id]
      if (rendered) {
        tinted[layer.id] = tintDrawing(rendered.canvas, layer.color)
      }
    }
    return tinted
  }, [renderedPages, visibleLayers])

  // Get largest page width & height for aspect ratio preservation
  const firstRendered = Object.values(renderedPages)[0]?.canvas
  const dimensions = firstRendered
    ? { width: firstRendered.width, height: firstRendered.height }
    : { width: 800, height: 600 }

  // Zoom & Pan states
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [spacePressed, setSpacePressed] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Keyboard listener for Spacebar pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
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
    const viewport = viewportRef.current
    if (!viewport) return
    const handleWheelPrevent = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    viewport.addEventListener('wheel', handleWheelPrevent, { passive: false })
    return () => {
      viewport.removeEventListener('wheel', handleWheelPrevent)
    }
  }, [firstRendered])

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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const isMiddleButton = e.button === 1
    const isRightButton = e.button === 2
    const forcePan = spacePressed || isMiddleButton || isRightButton || (e.button === 0 && !alignState.active)

    if (forcePan) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }

  const stopDrag = () => {
    setIsPanning(false)
  }

  // Fit to screen on initial load
  useEffect(() => {
    if (!firstRendered || !viewportRef.current) return
    const viewport = viewportRef.current
    const containerWidth = viewport.clientWidth
    const containerHeight = viewport.clientHeight
    const pageWidth = dimensions.width
    const pageHeight = dimensions.height

    if (containerWidth > 0 && containerHeight > 0) {
      const scaleX = containerWidth / pageWidth
      const scaleY = containerHeight / pageHeight
      const newScale = Math.min(scaleX, scaleY) * 0.95
      const newOffsetX = (containerWidth - pageWidth * newScale) / 2
      const newOffsetY = (containerHeight - pageHeight * newScale) / 2

      setScale(newScale)
      setOffset({ x: newOffsetX, y: newOffsetY })
    }
  }, [firstRendered])

  // ─── Canvas Click Handler for Alignment points ──────────────────────────────
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!alignState.active || !alignState.layerId) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickXOnViewport = e.clientX - rect.left
    const clickYOnViewport = e.clientY - rect.top

    // Map screen coordinate using offset and zoom scale to raw canvas pixels
    const point = {
      x: (clickXOnViewport - offset.x) / scale,
      y: (clickYOnViewport - offset.y) / scale,
    }

    if (alignState.step === 'base1') {
      setAlignState(prev => ({ ...prev, step: 'base2', base1: point }))
    } else if (alignState.step === 'base2') {
      setAlignState(prev => ({ ...prev, step: 'layer1', base2: point }))
    } else if (alignState.step === 'layer1') {
      setAlignState(prev => ({ ...prev, step: 'layer2', layer1: point }))
    } else if (alignState.step === 'layer2') {
      // Calculate final transform metrics
      const b1 = alignState.base1!
      const b2 = alignState.base2!
      const l1 = alignState.layer1!
      const l2 = point

      const dx1 = b2.x - b1.x
      const dy1 = b2.y - b1.y
      const dist1 = Math.hypot(dx1, dy1)
      const angle1 = Math.atan2(dy1, dx1)

      const dx2 = l2.x - l1.x
      const dy2 = l2.y - l1.y
      const dist2 = Math.hypot(dx2, dy2)
      const angle2 = Math.atan2(dy2, dx2)

      const computedScale = dist2 > 0 ? dist1 / dist2 : 1
      const computedAngle = angle1 - angle2

      updateLayer(alignState.layerId, {
        alignmentTransform: {
          scale: computedScale,
          angle: computedAngle,
          base1: b1,
          base2: b2,
          layer1: l1,
          layer2: l2,
        },
      })

      setAlignState({
        active: false,
        layerId: null,
        step: 'done',
      })
    }
  }

  return (
    <div className="h-full flex flex-col space-y-4">
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
            <Layers size={16} style={{ color: 'var(--orange)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
              Sobreposição de Projetos
            </span>
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--slate)' }}>
            {baseDrawing.floor} · {baseDrawing.discipline}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left panel – layer controls */}
        <div className="w-80 flex-shrink-0 space-y-3 overflow-y-auto pr-1">
          {/* Alignment Wizard Helper */}
          {alignState.active && (
            <Card className="p-3 border-2 border-orange-500 bg-orange-500/10 space-y-2">
              <div className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                <Move size={14} /> Alinhamento de Camada
              </div>
              <p className="text-xs text-slate-300">
                {alignState.step === 'base1' && '1. Clique no primeiro ponto comum no projeto BASE (ex: pilar, poço).'}
                {alignState.step === 'base2' && '2. Clique no segundo ponto comum no projeto BASE.'}
                {alignState.step === 'layer1' && '3. Clique no primeiro ponto correspondente na CAMADA secundária.'}
                {alignState.step === 'layer2' && '4. Clique no segundo ponto correspondente na CAMADA secundária.'}
              </p>
              <div className="flex gap-1.5 justify-end">
                <Button size="sm" variant="ghost" onClick={cancelAlignment}>
                  <X size={12} /> Cancelar
                </Button>
              </div>
            </Card>
          )}

          {/* Options */}
          <Card className="p-3">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--white)' }}>Opções</div>

            {/* Page selector */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs" style={{ color: 'var(--slate)' }}>Página</span>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors text-xs"
                style={{ color: 'var(--slate)' }}
                disabled={page <= 1 || rendering}
              >‹</button>
              <span className="text-xs font-mono" style={{ color: 'var(--white)' }}>{page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors text-xs"
                style={{ color: 'var(--slate)' }}
                disabled={rendering}
              >›</button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={removeText}
                onChange={e => setRemoveText(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer accent-orange-500"
              />
              <span className="text-xs" style={{ color: 'var(--slate)' }}>
                Remover textos do PDF (Experimental)
              </span>
            </label>
          </Card>

          {/* Layers List (Draggable for reordering Z-index) */}
          <div className="space-y-2">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">
              Camadas (Arraste para ordenar o Z-index)
            </div>
            {layers.map((layer, index) => (
              <div
                key={layer.id}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className="cursor-grab active:cursor-grabbing transition-transform"
                style={{
                  opacity: draggedIndex === index ? 0.4 : 1,
                  transform: 'translateZ(0)', // hardware acceleration
                }}
              >
                <Card className="p-3 space-y-3" style={{ border: `1px solid ${layer.color}33` }}>
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-1">
                      {/* Reorder Buttons (Useful for mobile/tablets) */}
                      <div className="flex flex-col gap-0.5 mr-1 flex-shrink-0">
                        <button
                          onClick={() => moveLayer(index, -1)}
                          disabled={index === 0}
                          className="p-0.5 hover:bg-white/10 rounded disabled:opacity-30"
                          style={{ color: 'var(--slate)' }}
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          onClick={() => moveLayer(index, 1)}
                          disabled={index === layers.length - 1}
                          className="p-0.5 hover:bg-white/10 rounded disabled:opacity-30"
                          style={{ color: 'var(--slate)' }}
                        >
                          <ArrowDown size={11} />
                        </button>
                      </div>
                      <div>
                        <div className="text-xs font-mono font-semibold truncate"
                          style={{ color: 'var(--white)', maxWidth: 170 }}>
                          {layer.code}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--slate)' }}>
                          {layer.discipline}
                          {layer.isBase && (
                            <span className="ml-1.5 px-1 py-0.5 rounded text-[9px] font-bold"
                              style={{ background: 'var(--surface-mid)', color: 'var(--orange)' }}>
                              BASE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
                      style={{ color: layer.visible ? 'var(--white)' : 'var(--slate)' }}
                      className="p-1 hover:bg-white/15 rounded"
                    >
                      {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>

                  {/* Color picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Cor</span>
                    <div className="flex gap-1 ml-auto">
                      {OVERLAY_COLORS.map(c => (
                        <button
                          key={c}
                          className="w-3.5 h-3.5 rounded-full transition-all"
                          style={{
                            background: c,
                            outline: layer.color === c ? `2px solid white` : 'none',
                            outlineOffset: '1px',
                          }}
                          onClick={() => updateLayer(layer.id, { color: c })}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Opacity */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Opacidade</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--white)' }}>{layer.opacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={layer.opacity}
                      onChange={e => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: layer.color }}
                    />
                  </div>

                  {/* Alignment options */}
                  {!layer.isBase && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-700/50 justify-between">
                      {layer.alignmentTransform ? (
                        <>
                          <span className="text-[10px] text-green-400 font-medium">✓ Alinhado</span>
                          <button
                            onClick={() => resetAlignment(layer.id)}
                            className="text-[10px] text-red-400 hover:underline flex items-center gap-0.5"
                          >
                            <RotateCcw size={10} /> Reset
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startAlignment(layer.id)}
                          className="text-[10px] text-orange-400 hover:underline flex items-center gap-1"
                        >
                          <Move size={10} /> Alinhar por Pontos
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={addLayer} className="w-full justify-center">
            <Plus size={14} /> Adicionar Documento
          </Button>
        </div>

        {/* Right panel – stacked canvases */}
        <div
          ref={viewportRef}
          className={`flex-1 rounded-xl overflow-hidden bg-white border relative p-4 ${
            isPanning ? 'cursor-grabbing' : alignState.active ? 'cursor-crosshair' : 'cursor-grab'
          }`}
          style={{ borderColor: 'var(--surface-border)' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onWheel={handleWheel}
          onClick={handleCanvasClick}
          onContextMenu={e => e.preventDefault()}
        >
          {rendering && (
            <div className="absolute inset-0 bg-[#0d1825]/40 backdrop-blur-xs flex items-center justify-center z-30">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          )}

          {error && (
            <div className="absolute inset-x-4 top-4 p-4 rounded-xl text-sm z-20" style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444' }}>
              {error}
            </div>
          )}

          {visibleLayers.length === 0 ? (
            <div className="text-sm text-slate-500">
              Nenhuma camada visível
            </div>
          ) : (
            <div
              ref={containerRef}
              className="absolute origin-top-left shadow-lg"
              style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transition: isPanning ? 'none' : 'transform 0.08s ease-out',
              }}
            >
              {/* Stacked Tinted Canvases */}
              {visibleLayers.map(layer => {
                const canvas = tintedCanvases[layer.id]
                if (!canvas) return null
                return (
                  <div
                    key={layer.id}
                    className="absolute inset-0 transition-opacity duration-150"
                    style={{ opacity: layer.opacity / 100 }}
                  >
                    {/* Render tinted canvas using transformation matrix if aligned */}
                    <canvas
                      ref={el => {
                        if (!el) return
                        el.width = canvas.width
                        el.height = canvas.height
                        const ctx = el.getContext('2d')
                        if (!ctx) return
                        ctx.clearRect(0, 0, canvas.width, canvas.height)
                        ctx.save()

                        const transform = layer.alignmentTransform
                        if (transform) {
                          // Apply Similarity Transformation
                          ctx.translate(transform.base1.x, transform.base1.y)
                          ctx.rotate(transform.angle)
                          ctx.scale(transform.scale, transform.scale)
                          ctx.translate(-transform.layer1.x, -transform.layer1.y)
                        }

                        ctx.drawImage(canvas, 0, 0)
                        ctx.restore()
                      }}
                      className="w-full h-full block"
                    />
                  </div>
                )
              })}

              {/* Active Alignment Reference Pins (Interactive HTML Overlay) */}
              {alignState.active && alignState.base1 && (
                <div
                  className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow z-30"
                  style={{
                    left: `${(alignState.base1.x / dimensions.width) * 100}%`,
                    top: `${(alignState.base1.y / dimensions.height) * 100}%`,
                    background: '#3B82F6',
                    color: 'white',
                  }}
                  title="Base - Ponto 1"
                >
                  B1
                </div>
              )}
              {alignState.active && alignState.base2 && (
                <div
                  className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow z-30"
                  style={{
                    left: `${(alignState.base2.x / dimensions.width) * 100}%`,
                    top: `${(alignState.base2.y / dimensions.height) * 100}%`,
                    background: '#22C55E',
                    color: 'white',
                  }}
                  title="Base - Ponto 2"
                >
                  B2
                </div>
              )}
              {alignState.active && alignState.layer1 && (
                <div
                  className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow z-30 animate-pulse"
                  style={{
                    left: `${(alignState.layer1.x / dimensions.width) * 100}%`,
                    top: `${(alignState.layer1.y / dimensions.height) * 100}%`,
                    background: '#EF4444',
                    color: 'white',
                  }}
                  title="Camada - Ponto 1"
                >
                  C1
                </div>
              )}
            </div>
          )}

          {/* Remove text mode hint */}
          {removeText && (
            <div className="absolute bottom-4 left-4 right-4 text-center z-20">
              <div className="inline-block text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(249,115,22,0.9)', color: 'white' }}>
                Modo "Remover Textos" ativado · Apenas linhas e hachuras visíveis
              </div>
            </div>
          )}

          {/* Floating Zoom controls */}
          {firstRendered && (
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-surface-mid rounded-lg p-1 border border-surface-border pointer-events-auto">
              <button
                onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s / 1.3, 0.25)) }}
                className="p-1 hover:bg-white/10 rounded cursor-pointer"
                title="Zoom Out"
                style={{ color: 'var(--slate)' }}
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] font-mono px-1 w-12 text-center" style={{ color: 'var(--white)' }}>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s * 1.3, 8)) }}
                className="p-1 hover:bg-white/10 rounded cursor-pointer"
                title="Zoom In"
                style={{ color: 'var(--slate)' }}
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setScale(1); setOffset({ x: 0, y: 0 }) }}
                className="p-1 hover:bg-white/10 rounded text-[9px] font-semibold cursor-pointer"
                style={{ color: 'var(--slate)' }}
              >
                1:1
              </button>
            </div>
          )}

          {/* Layer legend */}
          <div className="absolute top-3 right-3 space-y-1 z-20">
            {visibleLayers.map(l => (
              <div key={l.id} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
                style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}>
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: l.color }} />
                <span className="font-mono" style={{ color: l.color }}>{l.code.split('-')[2] || l.discipline}</span>
                <span className="opacity-60">{l.opacity}%</span>
                {l.alignmentTransform && <span className="text-[10px] text-green-400">★</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
